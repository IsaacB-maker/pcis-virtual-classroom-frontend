
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { useClassroomData } from "./useClassroomData";
import { useClassroomMedia } from "./useClassroomMedia";
import { useWebRTC } from "./useWebRTC";
import { useClassroomSocket } from "./useClassroomSocket";
import "../../styles/ClassroomConference.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const MAX_CHAT_MESSAGE_LENGTH = 2000;

export default function ClassroomConference({ className }) {
  const navigate = useNavigate();

  const {
    isTeacher,
    currentClassName,
    schoolClass,
    lessons,
    liveLesson,
    loading,
    error,
    joined,
    setJoined,
    socketConnected,
    setSocketConnected,
    teacher,
  } = useClassroomData(className);

    // Read the registered student saved during student login.
  const [loggedInStudent] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const savedStudent = sessionStorage.getItem("pcisStudent");

      if (!savedStudent) {
        return null;
      }

      const parsedStudent = JSON.parse(savedStudent);

      // Support either a direct student record or a wrapped response.
      return parsedStudent?.student || parsedStudent;
    } catch (err) {
      console.error(
        "Could not read the logged-in student:",
        err
      );

      return null;
    }
  });

  const studentName = String(
    loggedInStudent?.full_name ||
    loggedInStudent?.name ||
    loggedInStudent?.student_name ||
    ""
  ).trim() || "Student";

  const {
    videoRef,
    streamRef,
    cameraOn,
    microphoneOn,
    mediaError,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMicrophone,
  } = useClassroomMedia();

  const socketRefBridge = useRef(null);
  const mountedRef = useRef(false);
  const teacherAutoJoinRoomRef = useRef(null);
  const endingRef = useRef(false);

  const screenStreamRef = useRef(null);
  const stopMediaRef = useRef(stopMedia);
  const closeConnectionsRef = useRef(null);
  const disconnectSocketRef = useRef(null);

  // Recording refs are independent of classroom controls.
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingCanvasRef = useRef(null);
  const recordingCanvasStreamRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const recordingAnimationRef = useRef(null);
  const recordingPromiseRef = useRef(null);
  const recordingStartedAtRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordingMessage, setRecordingMessage] = useState("");

  const [handRaised, setHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "System",
      role: "system",
      text: "Welcome to the live virtual classroom!",
      time: "Just now",
    },
  ]);

  const [messageInput, setMessageInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [endClassError, setEndClassError] = useState("");
  const [endingClass, setEndingClass] = useState(false);
  const [localMediaError, setLocalMediaError] = useState("");

  // ---------------------------------------------------------
  // WEBSOCKET MESSAGES
  // ---------------------------------------------------------

  const sendSocketMessage = useCallback((message) => {
    const socket = socketRefBridge.current?.current;

    if (
      !socket ||
      typeof WebSocket === "undefined" ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return false;
    }

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error("Could not send classroom message:", err);
      return false;
    }
  }, []);

  const handleIncomingChatMessage = useCallback((msgData) => {
    const text = msgData?.message;

    if (typeof text !== "string" || !text.trim()) {
      return;
    }

    const timestamp = msgData.timestamp
      ? new Date(msgData.timestamp)
      : new Date();

    const formattedTime = Number.isNaN(timestamp.getTime())
      ? new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

    setChatMessages((previous) => [
      ...previous,
      {
        id:
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        sender: msgData.name || "Participant",
        role: msgData.role || "student",
        text: text.trim(),
        time: formattedTime,
      },
    ]);
  }, []);

  const {
    peerConnectionsRef,
    remoteVideosRef,
    pendingCandidatesRef,
    peerIdRef,
    remoteParticipants,
    setRemoteParticipants,
    closeAllPeerConnections,
    createPeerConnection,
  } = useWebRTC({
    streamRef,
    sendSocketMessage,
  });

  const {
    socketRef,
    connectSocket,
    disconnectSocket,
    sendSocketMessage: sendThroughSocket,
  } = useClassroomSocket({
    peerIdRef,
    setSocketConnected,
    setRemoteParticipants,
    createPeerConnection,
    remoteVideosRef,
    pendingCandidatesRef,
    sendSocketMessage,
    peerConnectionsRef,
    onChatMessage: handleIncomingChatMessage,
  });

  socketRefBridge.current = socketRef;
  screenStreamRef.current = screenStream;
  stopMediaRef.current = stopMedia;
  closeConnectionsRef.current = closeAllPeerConnections;
  disconnectSocketRef.current = disconnectSocket;

  // ---------------------------------------------------------
  // ACTIVE LESSON AND SESSION
  // ---------------------------------------------------------

  const teacherLesson = useMemo(() => {
    if (!isTeacher || !schoolClass || !teacher?.id) {
      return null;
    }

    const classId = String(schoolClass.id);
    const teacherId = String(teacher.id);

    const candidates = lessons.filter((lesson) => {
      const lessonClassId =
        lesson.school_class &&
        typeof lesson.school_class === "object"
          ? lesson.school_class.id
          : lesson.school_class;

      const lessonTeacherId =
        lesson.teacher &&
        typeof lesson.teacher === "object"
          ? lesson.teacher.id
          : lesson.teacher;

      const lessonStatus = String(
        lesson.status || ""
      ).toLowerCase();

      return (
        String(lessonClassId) === classId &&
        String(lessonTeacherId) === teacherId &&
        ["scheduled", "live"].includes(lessonStatus) &&
        Boolean(lesson.classroom_session?.id) &&
        Boolean(lesson.classroom_session?.room_id)
      );
    });

    return (
      [...candidates].sort(
        (a, b) => Number(b.id) - Number(a.id)
      )[0] || null
    );
  }, [isTeacher, schoolClass, teacher?.id, lessons]);

  const activeLesson = isTeacher ? teacherLesson : liveLesson;
  const session = activeLesson?.classroom_session;

  const roomId = session?.room_id || null;
  const sessionId = session?.id || null;
  const lessonId = activeLesson?.id || null;

  const hasLiveRoom = Boolean(
    liveLesson?.status === "live" &&
    liveLesson?.classroom_session?.status === "live" &&
    liveLesson?.classroom_session?.is_live === true &&
    liveLesson?.classroom_session?.room_id
  );

  const classroomIsLive = Boolean(
    activeLesson?.status === "live" &&
    session?.status === "live" &&
    session?.is_live === true
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------
  // TEACHER CLASSROOM STARTUP
  // ---------------------------------------------------------

  useEffect(() => {
    if (
      !isTeacher ||
      joined ||
      !teacherLesson ||
      !roomId ||
      !sessionId ||
      !lessonId ||
      !teacher?.id ||
      loading ||
      teacherAutoJoinRoomRef.current === String(roomId)
    ) {
      return;
    }

    const roomKey = String(roomId);
    teacherAutoJoinRoomRef.current = roomKey;

    let cancelled = false;

    async function startTeacherClassroom() {
      try {
        setLocalMediaError("");
        setEndClassError("");

        const response = await fetch(
          `${API_BASE_URL}/sessions/${sessionId}/start/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              teacher: teacher.id,
            }),
          }
        );

        let result = {};

        try {
          result = await response.json();
        } catch {
          // The response may not contain JSON.
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              "Django could not start this classroom session."
          );
        }

        await startMedia();

        if (cancelled || !mountedRef.current) {
          stopMedia();
          return;
        }

        setJoined(true);

        connectSocket(
          roomId,
          teacher.name || "Teacher",
          "teacher"
        );
      } catch (err) {
        console.error("Teacher classroom startup failed:", err);

        if (!cancelled && mountedRef.current) {
          setLocalMediaError(
            err.message ||
              "The classroom could not start. Check your camera, microphone, and classroom session."
          );

          teacherAutoJoinRoomRef.current = null;
        }
      }
    }

    startTeacherClassroom();

    return () => {
      cancelled = true;
    };
  }, [
    isTeacher,
    joined,
    teacherLesson,
    roomId,
    sessionId,
    lessonId,
    teacher?.id,
    teacher?.name,
    loading,
    startMedia,
    stopMedia,
    connectSocket,
    setJoined,
  ]);

  // Student camera and microphone preview.
  useEffect(() => {
    if (isTeacher || joined || loading) return;

    let cancelled = false;

    startMedia().catch((err) => {
      if (!cancelled) {
        console.warn(
          "Student media preview could not start:",
          err
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isTeacher, joined, loading, startMedia]);

  // ---------------------------------------------------------
  // WEBRTC VIDEO TRACK REPLACEMENT
  // ---------------------------------------------------------

  const replaceVideoTrackForPeers = useCallback(
    async (track) => {
      const peers = Object.values(peerConnectionsRef.current);

      await Promise.all(
        peers.map(async (peer) => {
          if (!peer || peer.signalingState === "closed") return;

          const videoTransceiver = peer
            .getTransceivers()
            .find(
              (transceiver) =>
                transceiver.receiver?.track?.kind === "video"
            );

          const videoSender =
            videoTransceiver?.sender ||
            peer
              .getSenders()
              .find((sender) => sender.track?.kind === "video");

          if (!videoSender) return;

          try {
            await videoSender.replaceTrack(track || null);
          } catch (err) {
            console.error(
              "Could not replace video track:",
              err
            );
          }
        })
      );
    },
    [peerConnectionsRef]
  );

  // ---------------------------------------------------------
  // CAMERA AND MICROPHONE
  // ---------------------------------------------------------

  const handleToggleCamera = useCallback(async () => {
    try {
      await toggleCamera();

      const actualCameraOn = Boolean(
        streamRef.current
          ?.getVideoTracks()
          .some(
            (track) =>
              track.readyState === "live" && track.enabled
          )
      );

      sendSocketMessage({
        type: "media-state",
        peer_id: peerIdRef.current,
        camera_on: actualCameraOn,
        microphone_on: Boolean(
          streamRef.current
            ?.getAudioTracks()
            .some(
              (track) =>
                track.readyState === "live" && track.enabled
            )
        ),
      });
    } catch (err) {
      console.error("Camera toggle failed:", err);

      setLocalMediaError(
        "Could not change the camera. Check your browser's camera permissions."
      );
    }
  }, [
    toggleCamera,
    streamRef,
    sendSocketMessage,
    peerIdRef,
  ]);

  const handleToggleMicrophone = useCallback(async () => {
    try {
      await toggleMicrophone();

      const actualMicrophoneOn = Boolean(
        streamRef.current
          ?.getAudioTracks()
          .some(
            (track) =>
              track.readyState === "live" && track.enabled
          )
      );

      sendSocketMessage({
        type: "media-state",
        peer_id: peerIdRef.current,
        camera_on: Boolean(
          streamRef.current
            ?.getVideoTracks()
            .some(
              (track) =>
                track.readyState === "live" && track.enabled
            )
        ),
        microphone_on: actualMicrophoneOn,
      });
    } catch (err) {
      console.error("Microphone toggle failed:", err);

      setLocalMediaError(
        "Could not change the microphone. Check your browser's microphone permissions."
      );
    }
  }, [
    toggleMicrophone,
    streamRef,
    sendSocketMessage,
    peerIdRef,
  ]);

  // ---------------------------------------------------------
  // SCREEN SHARING
  // ---------------------------------------------------------

  const handleToggleScreenShare = useCallback(async () => {
    if (!isTeacher) return;

    if (!isScreenSharing) {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          setLocalMediaError(
            "Screen sharing is not supported by this browser."
          );
          return;
        }

        const displayStream =
          await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });

        const displayTrack = displayStream.getVideoTracks()[0];

        if (!displayTrack) {
          displayStream.getTracks().forEach((track) => track.stop());
          return;
        }

        await replaceVideoTrackForPeers(displayTrack);

        setScreenStream(displayStream);
        setIsScreenSharing(true);

        if (videoRef.current) {
          videoRef.current.srcObject = displayStream;
        }

        displayTrack.onended = () => {
          void (async () => {
            const cameraTrack =
              streamRef.current?.getVideoTracks()[0] || null;

            await replaceVideoTrackForPeers(cameraTrack);

            displayStream.getTracks().forEach((track) => {
              track.onended = null;
              track.stop();
            });

            if (mountedRef.current) {
              setScreenStream(null);
              setIsScreenSharing(false);

              if (videoRef.current) {
                videoRef.current.srcObject =
                  streamRef.current || null;
              }
            }
          })();
        };
      } catch (err) {
        if (err?.name !== "NotAllowedError") {
          console.error("Screen sharing failed:", err);
          setLocalMediaError("Could not start screen sharing.");
        }
      }

      return;
    }

    try {
      const cameraTrack =
        streamRef.current?.getVideoTracks()[0] || null;

      await replaceVideoTrackForPeers(cameraTrack);

      if (screenStream) {
        screenStream.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });
      }

      setScreenStream(null);
      setIsScreenSharing(false);

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current || null;
      }
    } catch (err) {
      console.error("Could not stop screen sharing:", err);
      setLocalMediaError("Could not restore the camera video.");
    }
  }, [
    isTeacher,
    isScreenSharing,
    screenStream,
    streamRef,
    videoRef,
    replaceVideoTrackForPeers,
  ]);

  // ---------------------------------------------------------
  // HAND RAISE
  // ---------------------------------------------------------

  const handleToggleHand = useCallback(() => {
    const newState = !handRaised;
    setHandRaised(newState);

    sendSocketMessage({
      type: "hand-raise",
      peer_id: peerIdRef.current,
      raised: newState,
    });
  }, [handRaised, sendSocketMessage, peerIdRef]);

  // ---------------------------------------------------------
  // START RECORDING
  // ---------------------------------------------------------

  const handleStartRecording = useCallback(async () => {
    if (!isTeacher || !joined || !lessonId || !sessionId) {
      setRecordingError(
        "The teacher must be in an active lesson before recording."
      );
      return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      return;
    }

    if (isSavingRecording || recordingPromiseRef.current) {
      setRecordingError(
        "Please wait for the previous recording to finish saving."
      );
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function"
    ) {
      setRecordingError(
        "Recording is not supported by this browser. Please use an updated version of Chrome or Edge."
      );
      return;
    }

    let canvasStream = null;
    let audioContext = null;

    try {
      setRecordingError("");
      setRecordingMessage("");

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not prepare the recording canvas.");
      }

      recordingCanvasRef.current = canvas;

      // Draw the live stage and up to four student video tiles.
      const drawFrame = () => {
        if (
          !recordingCanvasRef.current ||
          mediaRecorderRef.current?.state !== "recording"
        ) {
          return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const sidebarWidth = 320;
        const stageWidth = width - sidebarWidth;

        context.fillStyle = "#17211c";
        context.fillRect(0, 0, width, height);

        context.fillStyle = "#ffffff";
        context.font = "bold 25px Arial";
        context.fillText(
          "Paraclete Classical International School",
          30,
          42
        );

        const stageVideo = document.querySelector(".stage-video");

        if (stageVideo && stageVideo.readyState >= 2) {
          try {
            context.drawImage(
              stageVideo,
              0,
              65,
              stageWidth,
              height - 65
            );
          } catch (drawError) {
            console.warn(
              "Could not draw the stage video:",
              drawError
            );
          }
        } else {
          context.fillStyle = "#26352c";
          context.fillRect(0, 65, stageWidth, height - 65);

          context.fillStyle = "#ffffff";
          context.font = "24px Arial";
          context.fillText(
            "Waiting for classroom video...",
            50,
            height / 2
          );
        }

        context.fillStyle = "#e8f4ed";
        context.fillRect(
          stageWidth,
          65,
          sidebarWidth,
          height - 65
        );

        context.fillStyle = "#146c43";
        context.font = "bold 20px Arial";
        context.fillText(
          "Participants",
          stageWidth + 18,
          45
        );

        const participantVideos = Array.from(
          document.querySelectorAll(".student-video")
        );

        const tilePadding = 12;
        const tileWidth = sidebarWidth - tilePadding * 2;
        const tileHeight = 145;

        participantVideos.slice(0, 4).forEach((video, index) => {
          const x = stageWidth + tilePadding;
          const y = 80 + index * (tileHeight + 12);

          context.fillStyle = "#d5e5da";
          context.fillRect(x, y, tileWidth, tileHeight);

          if (video.readyState >= 2) {
            try {
              context.drawImage(
                video,
                x,
                y,
                tileWidth,
                tileHeight
              );
            } catch (drawError) {
              console.warn(
                "Could not draw a participant video:",
                drawError
              );
            }
          }
        });

        recordingAnimationRef.current =
          requestAnimationFrame(drawFrame);
      };

      canvasStream = canvas.captureStream(20);
      recordingCanvasStreamRef.current = canvasStream;

      // Mix audio from the teacher and available remote participants.
      const audioStreams = new Set();

      if (streamRef.current) {
        audioStreams.add(streamRef.current);
      }

      remoteParticipants.forEach((participant) => {
        if (participant.stream) {
          audioStreams.add(participant.stream);
        }
      });

      if (audioStreams.size > 0) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (AudioContextClass) {
          audioContext = new AudioContextClass();

          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          const audioDestination =
            audioContext.createMediaStreamDestination();

          audioStreams.forEach((audioStream) => {
            if (!audioStream.getAudioTracks().length) {
              return;
            }

            try {
              const source =
                audioContext.createMediaStreamSource(audioStream);

              source.connect(audioDestination);
            } catch (audioError) {
              console.warn(
                "Could not include participant audio:",
                audioError
              );
            }
          });

          audioDestination.stream
            .getAudioTracks()
            .forEach((track) => {
              canvasStream.addTrack(track);
            });
        }
      }

      recordingAudioContextRef.current = audioContext;

      const preferredTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];

      const supportedType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = supportedType
        ? new MediaRecorder(canvasStream, {
            mimeType: supportedType,
          })
        : new MediaRecorder(canvasStream);

      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      // This promise resolves after Django has accepted the video.
      recordingPromiseRef.current = new Promise(
        (resolve, reject) => {
          recorder.onstop = async () => {
            try {
              const mimeType = recorder.mimeType || "video/webm";

              const blob = new Blob(
                recordingChunksRef.current,
                { type: mimeType }
              );

              recordingChunksRef.current = [];

              if (!blob.size) {
                throw new Error(
                  "The recording is empty. Please try recording again."
                );
              }

              setIsSavingRecording(true);
              setRecordingMessage(
                "Recording finished. Uploading to Django..."
              );

              const formData = new FormData();

              formData.append("lesson_id", String(lessonId));
              formData.append(
                "video",
                blob,
                `pcis-lesson-${lessonId}-${Date.now()}.webm`
              );

              const response = await fetch(
                `${API_BASE_URL}/recordings/upload/`,
                {
                  method: "POST",
                  body: formData,
                }
              );

              let result = {};

              try {
                result = await response.json();
              } catch {
                // Use the HTTP status if the response is not JSON.
              }

              if (!response.ok) {
                throw new Error(
                  result.error ||
                    result.detail ||
                    result.message ||
                    `Django could not save the recording (HTTP ${response.status}).`
                );
              }

              const startedAt = recordingStartedAtRef.current;
              const elapsedSeconds = startedAt
                ? Math.max(
                    1,
                    Math.round((Date.now() - startedAt) / 1000)
                  )
                : 1;

              setRecordingMessage(
                `Recording uploaded successfully. Duration: ${Math.floor(
                  elapsedSeconds / 60
                )}m ${elapsedSeconds % 60}s.`
              );

              resolve(result);
            } catch (uploadError) {
              console.error(
                "Recording upload failed:",
                uploadError
              );

              setRecordingError(
                uploadError.message ||
                  "The recording could not be uploaded."
              );

              setRecordingMessage("");
              reject(uploadError);
            } finally {
              if (recordingAnimationRef.current !== null) {
                cancelAnimationFrame(
                  recordingAnimationRef.current
                );

                recordingAnimationRef.current = null;
              }

              if (recordingCanvasStreamRef.current) {
                recordingCanvasStreamRef.current
                  .getTracks()
                  .forEach((track) => track.stop());

                recordingCanvasStreamRef.current = null;
              }

              if (recordingAudioContextRef.current) {
                try {
                  await recordingAudioContextRef.current.close();
                } catch (audioError) {
                  console.warn(
                    "Could not close recording audio:",
                    audioError
                  );
                }

                recordingAudioContextRef.current = null;
              }

              mediaRecorderRef.current = null;
              recordingCanvasRef.current = null;
              recordingStartedAtRef.current = null;

              setIsRecording(false);
              setIsSavingRecording(false);
            }
          };
        }
      );

      recorder.onerror = (event) => {
        setRecordingError(
          event.error?.message ||
            "A browser recording error occurred."
        );
      };

      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      recorder.start(1000);
      setIsRecording(true);
      setRecordingMessage("Recording is in progress.");

      recordingAnimationRef.current =
        requestAnimationFrame(drawFrame);
    } catch (err) {
      console.error("Could not start recording:", err);

      if (recordingAnimationRef.current !== null) {
        cancelAnimationFrame(recordingAnimationRef.current);
        recordingAnimationRef.current = null;
      }

      canvasStream?.getTracks().forEach((track) => track.stop());

      if (audioContext) {
        try {
          await audioContext.close();
        } catch {
          // Continue cleanup.
        }
      }

      recordingCanvasStreamRef.current = null;
      recordingAudioContextRef.current = null;
      recordingCanvasRef.current = null;
      mediaRecorderRef.current = null;
      recordingPromiseRef.current = null;
      recordingStartedAtRef.current = null;

      setIsRecording(false);
      setIsSavingRecording(false);
      setRecordingError(
        err.message || "Could not start classroom recording."
      );
    }
  }, [
    isTeacher,
    joined,
    lessonId,
    sessionId,
    isSavingRecording,
    streamRef,
    remoteParticipants,
  ]);

  // ---------------------------------------------------------
  // STOP RECORDING AND SAVE
  // ---------------------------------------------------------

  const handleStopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;

    setRecordingError("");

    if (recorder?.state === "recording") {
      try {
        recorder.stop();
        setRecordingMessage(
          "Recording stopped. Preparing the video for upload..."
        );
      } catch (err) {
        setRecordingError(
          err.message || "Could not stop the recording."
        );
        return;
      }
    }

    // If an upload is already in progress, wait for its result.
    const pendingSave = recordingPromiseRef.current;

    if (pendingSave) {
      try {
        await pendingSave;
      } catch (err) {
        console.error("Recording save failed:", err);
      } finally {
        if (recordingPromiseRef.current === pendingSave) {
          recordingPromiseRef.current = null;
        }
      }
    }
  }, []);

  // ---------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------

  const handleSendMessage = useCallback(
    (event) => {
      event.preventDefault();

      const text = messageInput.trim();

      if (!text) return;

      if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
        setChatError(
          `Messages must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`
        );
        return;
      }

      if (!socketConnected) {
        setChatError(
          "You are not connected to the classroom chat yet. Please wait for the live connection."
        );
        return;
      }

      const sent = sendThroughSocket({
        type: "chat-message",
        message: text,
      });

      if (sent) {
        setMessageInput("");
        setChatError("");
      } else {
        setChatError(
          "Your message could not be sent. Please check the classroom connection and try again."
        );
      }
    },
    [messageInput, socketConnected, sendThroughSocket]
  );

  // ---------------------------------------------------------
  // LOCAL MEDIA CLEANUP
  // ---------------------------------------------------------

  const releaseLocalMedia = useCallback(() => {
    const currentScreenStream = screenStreamRef.current;

    if (currentScreenStream) {
      currentScreenStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    }

    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    stopMedia();
  }, [stopMedia]);

  // ---------------------------------------------------------
  // END CLASS
  // ---------------------------------------------------------

  const handleEndClass = useCallback(async () => {
    if (!sessionId || !teacher?.id || endingRef.current) {
      setEndClassError(
        "The classroom session or teacher information is missing."
      );
      return;
    }

    endingRef.current = true;
    setEndingClass(true);
    setEndClassError("");

    // Stop an active recording, but do not make ending the class
    // depend on the recording upload succeeding.
    const recorder = mediaRecorderRef.current;

    if (recorder?.state === "recording") {
      try {
        recorder.stop();
        setRecordingMessage(
          "Class is ending. The recording is being prepared for saving..."
        );
      } catch (recordingStopError) {
        console.error(
          "Could not stop recording while ending class:",
          recordingStopError
        );

        setRecordingError(
          recordingStopError.message ||
            "Could not stop the recording cleanly."
        );
      }
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/end/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacher: teacher.id,
          }),
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        // Some responses may not contain JSON.
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Could not end the classroom session."
        );
      }

      releaseLocalMedia();
      closeAllPeerConnections();
      disconnectSocket();
      setJoined(false);

      navigate("/teacher/dashboard");
    } catch (err) {
      console.error("Could not end class:", err);

      setEndClassError(
        err.message ||
          "Something went wrong while ending the class."
      );

      endingRef.current = false;
      setEndingClass(false);
    }
  }, [
    sessionId,
    teacher?.id,
    releaseLocalMedia,
    closeAllPeerConnections,
    disconnectSocket,
    setJoined,
    navigate,
  ]);

  const handleLeaveClass = useCallback(() => {
    releaseLocalMedia();
    closeAllPeerConnections();
    disconnectSocket();
    setJoined(false);
    navigate(-1);
  }, [
    releaseLocalMedia,
    closeAllPeerConnections,
    disconnectSocket,
    setJoined,
    navigate,
  ]);

  // Clean up connections when the component unmounts.
  useEffect(() => {
    return () => {
      const currentScreenStream = screenStreamRef.current;

      if (currentScreenStream) {
        currentScreenStream.getTracks().forEach((track) => {
          track.onended = null;
          track.stop();
        });
      }

      // If navigation/unmount occurs while recording, stop it so
      // the recorder can trigger its upload handler.
      const recorder = mediaRecorderRef.current;

      if (recorder?.state === "recording") {
        try {
          recorder.stop();
        } catch (err) {
          console.warn(
            "Could not stop recorder during cleanup:",
            err
          );
        }
      }

      if (recordingAnimationRef.current !== null) {
        cancelAnimationFrame(recordingAnimationRef.current);
        recordingAnimationRef.current = null;
      }

      stopMediaRef.current?.();
      closeConnectionsRef.current?.();
      disconnectSocketRef.current?.();
    };
  }, []);

  // ---------------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------------

  const teacherParticipant = isTeacher
    ? {
        isLocal: true,
        name: teacher?.name || "Teacher",
        role: "teacher",
      }
    : remoteParticipants.find(
        (participant) => participant.role === "teacher"
      );

  const studentParticipants = remoteParticipants.filter(
    (participant) => participant.role !== "teacher"
  );

  const liveStudentCount =
    studentParticipants.length + (!isTeacher && joined ? 1 : 0);

  const totalParticipantCount = joined
    ? remoteParticipants.length + 1
    : remoteParticipants.length;

  const activeTeacherName = isTeacher
    ? teacher?.name || "Teacher"
    : teacherParticipant?.name ||
      liveLesson?.teacher_name ||
      "Instructor";

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
  <div className="classroom-conference-container">
      {/* Header with End/Leave, Title, Participant Count, and Connection Status */}
      <header className="classroom-header">
        <div className="header-left">
          {isTeacher ? (
            <div className="teacher-header-controls" style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleEndClass}
                disabled={endingClass || !sessionId || !joined}
                className="control-btn end-class-btn"
              >
                {endingClass ? "Ending Class..." : "🔴 End Class (For All)"}
              </button>

              {joined && (
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`control-btn record-btn ${isRecording ? "recording-active" : ""}`}
                >
                  {isRecording ? "⏹️ Stop Recording" : "⏺️ Start Record"}
                </button>
              )}
            </div>
          ) : joined ? (
            <button onClick={handleLeaveClass} className="control-btn leave-btn">
              🚪 Leave Class
            </button>
          ) : null}
        </div>

        <div className="class-title-badge">
          <h1>
            {currentClassName || "Classroom"} Live Session
          </h1>

          <span className="live-tag">
            {classroomIsLive ? "LIVE" : "NOT LIVE"}
          </span>
        </div>

        <div className="header-right">
          <div className="connection-status">
            <span
              className={`status-indicator ${
                socketConnected ? "connected" : "disconnected"
              }`}
            />

            {socketConnected
              ? "Live Connected"
              : "Not Connected"}
          </div>
        </div>
      </header>

      {endClassError && (
        <div className="classroom-error" role="alert">
          {endClassError}
        </div>
      )}

      {(mediaError || localMediaError) && (
        <div className="media-error-text" role="alert">
          {localMediaError || mediaError}

          <button
            type="button"
            onClick={() => setLocalMediaError("")}
            className="close-btn"
            aria-label="Dismiss media error"
          >
            ✖
          </button>
        </div>
      )}

      {recordingError && (
        <div className="classroom-error" role="alert">
          {recordingError}

          <button
            type="button"
            onClick={() => setRecordingError("")}
            className="close-btn"
            aria-label="Dismiss recording error"
          >
            ✖
          </button>
        </div>
      )}

      {recordingMessage && (
        <div className="media-error-text" role="status">
          {recordingMessage}
        </div>
      )}

      {/* Student pre-join lobby */}
      {!isTeacher && !joined ? (
        <div className="student-lobby-container">
          <div className="lobby-card">
            <div className="lobby-header-badge">
              {hasLiveRoom
                ? "Classroom Ready"
                : "Classroom Information"}
            </div>

            <h2>{currentClassName} Classroom</h2>

            {loading ? (
              <p>Checking for a live lesson...</p>
            ) : error ? (
              <p className="classroom-error">{error}</p>
            ) : !hasLiveRoom ? (
              <div className="no-live-lesson-message">
                <h3>
                  There is no lesson going on in this class.
                </h3>
                <p>
                  Your teacher's lesson details and Join Classroom
                  button will appear here when a lesson starts.
                </p>
              </div>
            ) : (
              <>
                <p className="lobby-lesson-title">
                  📚 Subject:{" "}
                  <strong>
                    {liveLesson.subject || "Not specified"}
                  </strong>
                </p>

                <p className="lobby-lesson-title">
                  📖 Topic:{" "}
                  <strong>
                    {liveLesson.title || "Not specified"}
                  </strong>
                </p>

                <p className="lobby-lesson-description">
                  {liveLesson.description ||
                    "Your teacher has not added a lesson description."}
                </p>

                <div className="lobby-teacher-pill">
                  👨‍🏫 Teacher:{" "}
                  <strong>
                    {liveLesson.teacher_name || "Teacher"}
                  </strong>
                </div>

                <div className="lobby-video-preview">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="preview-video"
                  />

                  <div className="preview-controls-overlay">
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className={`preview-toggle-btn ${
                        !cameraOn ? "off" : ""
                      }`}
                    >
                      {cameraOn ? "📷 Cam On" : "📷 Cam Off"}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMicrophone}
                      className={`preview-toggle-btn ${
                        !microphoneOn ? "off" : ""
                      }`}
                    >
                      {microphoneOn
                        ? "🎤 Mic On"
                        : "🔇 Mic Muted"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!hasLiveRoom || !roomId || !sessionId}
                  onClick={() => {
                      if (!hasLiveRoom || !roomId) return;

                        connectSocket(
                          roomId,
                          studentName,
                          "student"
                        );

                      setJoined(true);
                    }}
                  className="control-btn green-btn lobby-join-btn"
                >
                  ▶ Join Classroom
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="classroom-body">
          {loading ? (
            <div className="classroom-loading">
              Preparing Virtual Stage...
            </div>
          ) : error ? (
            <div className="classroom-error">{error}</div>
          ) : isTeacher && !activeLesson ? (
            <div className="classroom-loading">
              <h3>
                No scheduled lesson was found for this class.
              </h3>
              <p>
                Please create a lesson for {currentClassName} from
                the teacher dashboard first.
              </p>
            </div>
          ) : (
            <div className="stage-and-sidebar">
              <div className="main-stage-container">
                {isTeacher || teacherParticipant ? (
                  <div className="teacher-stage-card">
                    <video
                      ref={(element) => {
                        if (isTeacher) {
                          videoRef.current = element;

                          if (
                            element &&
                            element.srcObject !==
                              (isScreenSharing
                                ? screenStream
                                : streamRef.current)
                          ) {
                            element.srcObject = isScreenSharing
                              ? screenStream
                              : streamRef.current || null;
                          }
                        } else if (
                          element &&
                          teacherParticipant?.stream &&
                          element.srcObject !==
                            teacherParticipant.stream
                        ) {
                          element.srcObject =
                            teacherParticipant.stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={isTeacher}
                      className="stage-video"
                    />

                    <div className="stage-overlay-badge">
                      <span className="teacher-icon">👨‍🏫</span>

                      <span className="teacher-name-text">
                        TEACHER:{" "}
                        <strong>{activeTeacherName}</strong>
                      </span>

                      {!microphoneOn && isTeacher && (
                        <span className="mic-muted">
                          🔇 Muted
                        </span>
                      )}
                    </div>

                    {handRaised && isTeacher && (
                      <div className="hand-raised-indicator">
                        ✋ Hand Raised
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="teacher-waiting-card">
                    <div className="pulse-icon">👨‍🏫</div>
                    <h3>
                      Waiting for {activeTeacherName} to join
                      the stage...
                    </h3>
                  </div>
                )}
              </div>

              <div className="classroom-sidebar">
                <div className="sidebar-header">
                  <h3>
                    Students Joined ({liveStudentCount})
                  </h3>
                </div>

                <div className="student-gallery-list">
                  {!isTeacher && joined && (
                    <div className="student-card local-student">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="student-video"
                      />

                      <div className="student-badge">
                        {studentName} (You) {!microphoneOn && "🔇"}
                      </div>

                      {handRaised && (
                        <span className="hand-badge">✋</span>
                      )}
                    </div>
                  )}

                  {studentParticipants.map((participant) => (
                    <div
                      key={participant.peerId}
                      className="student-card"
                    >
                      <video
                        autoPlay
                        playsInline
                        ref={(element) => {
                          if (
                            element &&
                            participant.stream &&
                            element.srcObject !== participant.stream
                          ) {
                            element.srcObject = participant.stream;
                          }
                        }}
                        className="student-video"
                      />

                      <div className="student-badge">
                        {participant.name || "Student"}{" "}
                        {!participant.microphoneOn && "🔇"}
                      </div>

                      {participant.handRaised && (
                        <span className="hand-badge">✋</span>
                      )}
                    </div>
                  ))}

                  {liveStudentCount === 0 && (
                    <div className="no-students-placeholder">
                      No students have joined yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showChat && (
            <div className="drawer-panel chat-panel">
              <div className="drawer-header">
                <h3>💬 Class Live Chat</h3>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowChat(false)}
                  aria-label="Close chat"
                >
                  ✖
                </button>
              </div>

              <div
                className="chat-messages"
                aria-live="polite"
                aria-label="Class chat messages"
              >
                {chatMessages.map((message) => (
                  <div key={message.id} className="chat-msg">
                    <div className="msg-header">
                      <strong>{message.sender}</strong>
                      <span className="msg-time">
                        {message.time}
                      </span>
                    </div>

                    <p className="msg-text">{message.text}</p>
                  </div>
                ))}
              </div>

              {chatError && (
                <div className="classroom-error" role="alert">
                  {chatError}
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="chat-input-form"
              >
                <input
                  type="text"
                  placeholder={
                    socketConnected
                      ? "Type a message to class..."
                      : "Connecting to classroom chat..."
                  }
                  value={messageInput}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  disabled={!socketConnected}
                  onChange={(event) => {
                    setMessageInput(event.target.value);

                    if (chatError) {
                      setChatError("");
                    }
                  }}
                  aria-label="Chat message"
                />

                <button
                  type="submit"
                  className="send-btn"
                  disabled={
                    !socketConnected || !messageInput.trim()
                  }
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {showParticipants && (
            <div className="drawer-panel participants-panel">
              <div className="drawer-header">
                <h3>
                  👥 Class Participants ({totalParticipantCount})
                </h3>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowParticipants(false)}
                  aria-label="Close participants"
                >
                  ✖
                </button>
              </div>

              <div className="participants-list">
                {joined && (
                  <div className="participant-item">
                    <span className="p-name">
                      {isTeacher
                        ? activeTeacherName
                        : `${studentName} (You)`}
                    </span>

                    <span
                      className={`p-role-tag ${
                        isTeacher ? "teacher-tag" : "student-tag"
                      }`}
                    >
                      {isTeacher
                        ? "Teacher (Host)"
                        : "Student"}
                    </span>
                  </div>
                )}

                {remoteParticipants.map((participant) => (
                  <div
                    key={participant.peerId}
                    className="participant-item"
                  >
                    <span className="p-name">
                      {participant.name || "Participant"}
                    </span>

                    <span
                      className={`p-role-tag ${
                        participant.role === "teacher"
                          ? "teacher-tag"
                          : "student-tag"
                      }`}
                    >
                      {participant.role || "Participant"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {((!isTeacher && joined) || isTeacher) && (
        <footer className="classroom-controls">
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`control-btn ${
              !cameraOn ? "off-btn" : "green-btn"
            }`}
          >
            {cameraOn ? "📷 Camera On" : "📷 Camera Off"}
          </button>

          <button
            type="button"
            onClick={handleToggleMicrophone}
            className={`control-btn ${
              !microphoneOn ? "off-btn" : "green-btn"
            }`}
          >
            {microphoneOn ? "🎤 Mic On" : "🔇 Mic Muted"}
          </button>

          {isTeacher && (
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`control-btn ${
                isScreenSharing
                  ? "active-white-btn"
                  : "green-btn"
              }`}
            >
              {isScreenSharing
                ? "💻 Stop Share"
                : "💻 Share Screen"}
            </button>
          )}

          {!isTeacher && (
            <button
              type="button"
              onClick={handleToggleHand}
              className={`control-btn ${
                handRaised
                  ? "active-white-btn"
                  : "green-btn"
              }`}
            >
              {handRaised ? "✋ Lower Hand" : "✋ Raise Hand"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowChat((previous) => !previous);
              setShowParticipants(false);
              setChatError("");
            }}
            className={`control-btn ${
              showChat ? "active-white-btn" : "green-btn"
            }`}
          >
            💬 Chat ({chatMessages.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setShowParticipants((previous) => !previous);
              setShowChat(false);
            }}
            className={`control-btn ${
              showParticipants
                ? "active-white-btn"
                : "green-btn"
            }`}
          >
            👥 People ({totalParticipantCount})
          </button>
        </footer>
      )}
    </div>
  );
}
