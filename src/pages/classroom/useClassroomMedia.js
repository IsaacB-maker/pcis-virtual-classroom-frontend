
import { useState, useRef, useCallback } from "react";

// This is a visual placeholder, NOT a physical camera.
// It allows the classroom interface to remain usable when
// the device has no camera or microphone.
const createDummyStream = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;

  const ctx = canvas.getContext("2d");

  if (!ctx || typeof canvas.captureStream !== "function") {
    throw new Error("Placeholder video is not supported.");
  }

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("PCIS Virtual Classroom", 320, 220);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "18px sans-serif";
  ctx.fillText("Camera unavailable", 320, 260);

  return canvas.captureStream(15);
};

const hasLiveTrack = (stream, kind) =>
  Boolean(
    stream?.getTracks().some(
      (track) =>
        track.kind === kind && track.readyState === "live"
    )
  );

const isLiveStream = (stream) =>
  Boolean(
    stream &&
      stream.getTracks().some(
        (track) => track.readyState === "live"
      )
  );

export function useClassroomMedia() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Keep placeholder media separate from physical media.
  const dummyStreamRef = useRef(null);

  // Prevent duplicate getUserMedia requests.
  const startPromiseRef = useRef(null);

  // Retain cleanup references for media-track listeners.
  const trackListenersRef = useRef([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const removeTrackListeners = useCallback(() => {
    trackListenersRef.current.forEach(({ track, event, handler }) => {
      track.removeEventListener(event, handler);
    });

    trackListenersRef.current = [];
  }, []);

  const attachStream = useCallback((stream) => {
    const video = videoRef.current;

    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    // Autoplay can be rejected by the browser. Do not let that
    // rejection restart the classroom or destroy the media stream.
    if (stream && typeof video.play === "function") {
      const playResult = video.play();

      if (playResult?.catch) {
        playResult.catch((error) => {
          console.debug("Video playback awaits user interaction:", error);
        });
      }
    }
  }, []);

  const syncMediaState = useCallback((stream) => {
    const isDummy = Boolean(
      stream && dummyStreamRef.current === stream
    );

    const videoTrack = stream
      ?.getVideoTracks()
      .find((track) => track.readyState === "live");

    const audioTrack = stream
      ?.getAudioTracks()
      .find((track) => track.readyState === "live");

    setCameraOn(
      !isDummy &&
        Boolean(videoTrack && videoTrack.enabled)
    );

    setMicrophoneOn(
      Boolean(audioTrack && audioTrack.enabled)
    );
  }, []);

  const watchTracks = useCallback(
    (stream) => {
      removeTrackListeners();

      if (!stream) return;

      const update = () => {
        // Ignore events from a stream that has already been replaced.
        if (streamRef.current !== stream) return;
        syncMediaState(stream);
      };

      stream.getTracks().forEach((track) => {
        ["ended", "mute", "unmute"].forEach((event) => {
          track.addEventListener(event, update);

          trackListenersRef.current.push({
            track,
            event,
            handler: update,
          });
        });
      });
    },
    [removeTrackListeners, syncMediaState]
  );

  const setActiveStream = useCallback(
    (stream, isDummy = false) => {
      removeTrackListeners();

      streamRef.current = stream;
      dummyStreamRef.current = isDummy ? stream : null;

      watchTracks(stream);
      attachStream(stream);
      syncMediaState(stream);
    },
    [attachStream, removeTrackListeners, syncMediaState, watchTracks]
  );

  const startMedia = useCallback(async () => {
    // Reuse an existing stream only if at least one track is live.
    if (isLiveStream(streamRef.current)) {
      attachStream(streamRef.current);
      syncMediaState(streamRef.current);
      return true;
    }

    // Clean up an old stream whose tracks have all ended.
    if (streamRef.current) {
      removeTrackListeners();

      streamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "ended") track.stop();
      });

      streamRef.current = null;
      dummyStreamRef.current = null;
    }

    // Reuse a pending media request.
    if (startPromiseRef.current) {
      return startPromiseRef.current;
    }

    const startPromise = (async () => {
      setMediaError("");

      const mediaDevices =
        typeof navigator !== "undefined"
          ? navigator.mediaDevices
          : null;

      if (!mediaDevices?.getUserMedia) {
        // Try placeholder video, then allow listener mode.
        try {
          const dummyStream = createDummyStream();
          setActiveStream(dummyStream, true);

          setMediaError(
            "Camera and microphone access are unavailable. You can enter in listener mode."
          );

          return true;
        } catch (error) {
          console.warn("Placeholder video is unavailable:", error);

          setActiveStream(null);

          setMediaError(
            "Camera and microphone are unavailable. You can still enter the classroom."
          );

          return true;
        }
      }

      // Try camera and microphone together first.
      try {
        const stream = await mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setActiveStream(stream);

        if (!hasLiveTrack(stream, "video")) {
          setMediaError("Your camera is unavailable.");
        }

        if (!hasLiveTrack(stream, "audio")) {
          setMediaError("Your microphone is unavailable.");
        }

        return true;
      } catch (error) {
        console.warn("Camera and microphone request failed:", error);
      }

      // If both failed, try the microphone independently.
      try {
        const stream = await mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        setActiveStream(stream);
        setMediaError(
          "Camera is unavailable. You joined with your microphone."
        );

        return true;
      } catch (error) {
        console.warn("Microphone-only request failed:", error);
      }

      // If the microphone failed, try the camera independently.
      try {
        const stream = await mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        setActiveStream(stream);
        setMediaError(
          "Microphone is unavailable. You joined with your camera."
        );

        return true;
      } catch (error) {
        console.warn("Camera-only request failed:", error);
      }

      // Last resort: create a clearly labelled placeholder.
      try {
        const dummyStream = createDummyStream();
        setActiveStream(dummyStream, true);

        setMediaError(
          "Camera and microphone are unavailable. You can enter in listener mode."
        );
      } catch (error) {
        console.warn("Placeholder video creation failed:", error);

        setActiveStream(null);

        setMediaError(
          "Camera and microphone are unavailable. You can still enter the classroom."
        );
      }

      // Media failure alone must not prevent classroom entry.
      return true;
    })();

    startPromiseRef.current = startPromise;

    try {
      return await startPromise;
    } catch (error) {
      console.error("Media startup error:", error);

      setMediaError(
        error?.message ||
          "Camera or microphone access is unavailable."
      );

      setCameraOn(false);
      setMicrophoneOn(false);

      return true;
    } finally {
      if (startPromiseRef.current === startPromise) {
        startPromiseRef.current = null;
      }
    }
  }, [
    attachStream,
    removeTrackListeners,
    setActiveStream,
    syncMediaState,
  ]);

  const stopMedia = useCallback(() => {
    const stream = streamRef.current;

    // Clear references before stopping tracks so that ended events
    // from the old stream cannot update the current classroom state.
    removeTrackListeners();

    streamRef.current = null;
    dummyStreamRef.current = null;

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setMicrophoneOn(false);
  }, [removeTrackListeners]);

  const toggleCamera = useCallback(() => {
    const stream = streamRef.current;

    if (!stream) {
      setCameraOn(false);
      setMediaError(
        "No camera stream is available. Check your camera permissions or rejoin the classroom."
      );
      return false;
    }

    // A placeholder is not a real camera and must never be reported
    // as one or sent as the teacher's actual camera.
    if (dummyStreamRef.current === stream) {
      setCameraOn(false);
      setMediaError("No physical camera is available on this device.");
      return false;
    }

    const videoTrack = stream
      .getVideoTracks()
      .find((track) => track.readyState === "live");

    if (!videoTrack) {
      setCameraOn(false);
      setMediaError(
        "No active camera track is available. Please rejoin or check camera permissions."
      );
      return false;
    }

    // Only change enabled. Never stop the track to turn the camera off.
    const nextState = !videoTrack.enabled;

    videoTrack.enabled = nextState;
    setCameraOn(nextState);
    setMediaError("");

    return nextState;
  }, []);

  const toggleMicrophone = useCallback(() => {
    const stream = streamRef.current;

    if (!stream) {
      setMicrophoneOn(false);
      setMediaError(
        "No microphone stream is available. Check your microphone permissions or rejoin the classroom."
      );
      return false;
    }

    const audioTrack = stream
      .getAudioTracks()
      .find((track) => track.readyState === "live");

    if (!audioTrack) {
      setMicrophoneOn(false);
      setMediaError(
        "No active microphone is available. Please check microphone permissions."
      );
      return false;
    }

    // Muting and unmuting must not restart the classroom.
    const nextState = !audioTrack.enabled;

    audioTrack.enabled = nextState;
    setMicrophoneOn(nextState);
    setMediaError("");

    return nextState;
  }, []);

  return {
    videoRef,
    streamRef,
    cameraOn,
    setCameraOn,
    microphoneOn,
    setMicrophoneOn,
    mediaError,
    setMediaError,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMicrophone,
  };
}
