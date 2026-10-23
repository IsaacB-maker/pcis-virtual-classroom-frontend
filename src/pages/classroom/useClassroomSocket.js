
import { useRef, useCallback } from "react";

const WS_BASE_URL = "ws://127.0.0.1:8000";

export function useClassroomSocket({
  peerIdRef,
  setSocketConnected,
  setRemoteParticipants,
  createPeerConnection,
  remoteVideosRef,
  pendingCandidatesRef,
  sendSocketMessage,
  peerConnectionsRef,
  onChatMessage,
}) {
  const socketRef = useRef(null);

  const sendThroughSocket = useCallback((message) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Could not send classroom message:", error);
      return false;
    }
  }, []);

  const connectSocket = useCallback(
    (roomId, name, role) => {
      if (!roomId) {
        console.error("Cannot connect: classroom room ID is missing.");
        setSocketConnected(false);
        return null;
      }

      const existingSocket = socketRef.current;

      if (
        existingSocket &&
        (existingSocket.readyState === WebSocket.OPEN ||
          existingSocket.readyState === WebSocket.CONNECTING)
      ) {
        return existingSocket;
      }

      if (existingSocket) {
        existingSocket.onopen = null;
        existingSocket.onmessage = null;
        existingSocket.onerror = null;
        existingSocket.onclose = null;

        try {
          existingSocket.close();
        } catch (error) {
          console.warn("Could not close previous socket:", error);
        }

        socketRef.current = null;
      }

      const peerId = peerIdRef.current;

      if (peerId == null || String(peerId).trim() === "") {
        console.error("Cannot connect: participant ID is missing.");
        setSocketConnected(false);
        return null;
      }

      const localPeerId = String(peerId);
      const localName = name || "Participant";
      const localRole = role || "student";

      const wsUrl =
        `${WS_BASE_URL}/ws/classroom/${encodeURIComponent(roomId)}/` +
        `?peer_id=${encodeURIComponent(localPeerId)}` +
        `&name=${encodeURIComponent(localName)}` +
        `&role=${encodeURIComponent(localRole)}`;

      let socket;

      try {
        socket = new WebSocket(wsUrl);
      } catch (error) {
        console.error("Could not create classroom socket:", error);
        setSocketConnected(false);
        return null;
      }

      socketRef.current = socket;
      setSocketConnected(false);

      const isCurrentSocket = () => socketRef.current === socket;

      const sendSignal = (message) => {
        if (
          !isCurrentSocket() ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return false;
        }

        try {
          socket.send(JSON.stringify(message));
          return true;
        } catch (error) {
          console.error("Could not send signaling message:", error);
          return false;
        }
      };

      const addPendingCandidates = async (peer, remotePeerId) => {
        if (!peer.remoteDescription) {
          return;
        }

        const id = String(remotePeerId);
        const pending = pendingCandidatesRef.current[id] || [];

        for (const candidate of pending) {
          try {
            await peer.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (error) {
            console.warn("Could not add queued ICE candidate:", error);
          }
        }

        pendingCandidatesRef.current[id] = [];
      };

      // Add or update a participant without creating duplicates.
      const updateParticipant = (data) => {
        const remotePeerId = data.peer_id;

        if (
          remotePeerId == null ||
          String(remotePeerId) === localPeerId
        ) {
          return;
        }

        const id = String(remotePeerId);

        setRemoteParticipants((participants) => {
          const existing = participants.find(
            (participant) => String(participant.peerId) === id
          );

          if (existing) {
            return participants.map((participant) =>
              String(participant.peerId) === id
                ? {
                    ...participant,
                    name:
                      data.name ||
                      participant.name ||
                      "Participant",
                    role:
                      data.role ||
                      participant.role ||
                      "student",
                    stream:
                      remoteVideosRef.current[id] ||
                      participant.stream ||
                      null,
                  }
                : participant
            );
          }

          return [
            ...participants,
            {
              peerId: remotePeerId,
              name: data.name || "Participant",
              role: data.role || "student",
              stream: remoteVideosRef.current[id] || null,
              cameraOn: true,
              microphoneOn: true,
              handRaised: false,
            },
          ];
        });
      };

      // Use the same offerer rule for both new and existing peers.
      const startOfferIfNeeded = async (remotePeerId) => {
        const id = String(remotePeerId);

        // Only one side creates an offer for each peer pair.
        if (localPeerId >= id) {
          return;
        }

        try {
          const peer = createPeerConnection(id);

          if (
            !peer ||
            peer.signalingState !== "stable"
          ) {
            return;
          }

          const offer = await peer.createOffer();

          if (!isCurrentSocket()) return;

          // Check again because the peer may have changed while awaiting.
          if (
            peerConnectionsRef.current[id] !== peer ||
            peer.signalingState !== "stable"
          ) {
            return;
          }

          await peer.setLocalDescription(offer);

          if (!isCurrentSocket()) return;

          sendSignal({
            type: "offer",
            peer_id: localPeerId,
            target_peer_id: id,
            offer: peer.localDescription,
          });
        } catch (error) {
          console.error("Could not create WebRTC offer:", error);
        }
      };

      // A new participant introduces themselves to everyone already
      // connected. Existing participants reply directly to that newcomer.
      const introduceSelfTo = (remotePeerId) => {
        sendSignal({
          type: "participant-info",
          target_peer_id: String(remotePeerId),
          peer_id: localPeerId,
          name: localName,
          role: localRole,
        });
      };

      socket.onopen = () => {
        if (!isCurrentSocket()) return;

        setSocketConnected(true);
        console.log("PCIS classroom socket connected.");

        // Explicitly register this participant with the backend.
        sendSignal({
          type: "join",
          peer_id: localPeerId,
          name: localName,
          role: localRole,
        });
      };

      socket.onclose = () => {
        if (!isCurrentSocket()) return;

        socketRef.current = null;
        setSocketConnected(false);
        console.log("PCIS classroom socket disconnected.");
      };

      socket.onerror = (error) => {
        if (!isCurrentSocket()) return;

        console.error("PCIS classroom socket error:", error);
        setSocketConnected(false);
      };

      socket.onmessage = async (event) => {
        if (!isCurrentSocket()) return;

        try {
          const data = JSON.parse(event.data);

          if (!data || typeof data.type !== "string") {
            return;
          }

          const remotePeerId = data.peer_id;
          const remoteId =
            remotePeerId == null ? "" : String(remotePeerId);

          // CHAT
          if (data.type === "chat-message") {
            onChatMessage?.(data);
            return;
          }

          // HAND RAISE
          if (data.type === "hand-raise") {
            if (!remoteId || remoteId === localPeerId) return;

            setRemoteParticipants((participants) =>
              participants.map((participant) =>
                String(participant.peerId) === remoteId
                  ? {
                      ...participant,
                      handRaised: data.raised === true,
                    }
                  : participant
              )
            );
            return;
          }

          // A PARTICIPANT HAS JOINED.
          if (data.type === "peer-joined") {
            if (!remoteId || remoteId === localPeerId) return;

            updateParticipant(data);

            // Tell the new participant who we are. This lets a student
            // discover a teacher who joined before the student arrived.
            introduceSelfTo(remoteId);

            await startOfferIfNeeded(remoteId);
            return;
          }

          // A PARTICIPANT HAS INTRODUCED THEMSELVES TO THIS NEW JOINER.
          if (data.type === "participant-info") {
            if (!remoteId || remoteId === localPeerId) return;

            updateParticipant(data);
            await startOfferIfNeeded(remoteId);
            return;
          }

          // PARTICIPANT LEFT.
          if (data.type === "peer-left") {
            if (!remoteId || remoteId === localPeerId) return;

            const peer = peerConnectionsRef.current[remoteId];

            // Remove the reference first to avoid duplicate cleanup.
            if (peer) {
              delete peerConnectionsRef.current[remoteId];

              peer.onconnectionstatechange = null;
              peer.onicecandidate = null;
              peer.ontrack = null;

              try {
                peer.close();
              } catch (error) {
                console.warn("Could not close departed peer:", error);
              }
            }

            const remoteStream = remoteVideosRef.current[remoteId];

            if (remoteStream) {
              remoteStream.getTracks().forEach((track) => {
                try {
                  track.stop();
                } catch {
                  // The track may already be stopped.
                }
              });
            }

            delete remoteVideosRef.current[remoteId];
            delete pendingCandidatesRef.current[remoteId];

            setRemoteParticipants((participants) =>
              participants.filter(
                (participant) =>
                  String(participant.peerId) !== remoteId
              )
            );
            return;
          }

          // REMOTE CAMERA AND MICROPHONE STATE.
          if (data.type === "media-state") {
            if (!remoteId || remoteId === localPeerId) return;

            // Merge identity and media state, even if the state event
            // arrives before the WebRTC track event.
            setRemoteParticipants((participants) => {
              const existing = participants.find(
                (participant) =>
                  String(participant.peerId) === remoteId
              );

              if (!existing) {
                return [
                  ...participants,
                  {
                    peerId: remotePeerId,
                    name: data.name || "Participant",
                    role: data.role || "student",
                    stream: remoteVideosRef.current[remoteId] || null,
                    cameraOn: data.camera_on === true,
                    microphoneOn: data.microphone_on === true,
                    handRaised: false,
                  },
                ];
              }

              return participants.map((participant) =>
                String(participant.peerId) === remoteId
                  ? {
                      ...participant,
                      name: data.name || participant.name,
                      role: data.role || participant.role,
                      cameraOn: data.camera_on === true,
                      microphoneOn: data.microphone_on === true,
                    }
                  : participant
              );
            });
            return;
          }

          // WEBRTC OFFER.
          if (data.type === "offer") {
            if (!remoteId || remoteId === localPeerId) return;

            if (
              data.target_peer_id != null &&
              String(data.target_peer_id) !== localPeerId
            ) {
              return;
            }

            try {
              const peer = createPeerConnection(remoteId);

              if (!peer) return;

              if (peer.signalingState !== "stable") {
                console.warn(
                  "Ignoring offer because the peer is not stable:",
                  remoteId
                );
                return;
              }

              await peer.setRemoteDescription(
                new RTCSessionDescription(data.offer)
              );

              if (!isCurrentSocket()) return;

              await addPendingCandidates(peer, remoteId);

              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);

              if (!isCurrentSocket()) return;

              sendSignal({
                type: "answer",
                peer_id: localPeerId,
                target_peer_id: remoteId,
                answer: peer.localDescription,
              });
            } catch (error) {
              console.error("Could not handle WebRTC offer:", error);
            }
            return;
          }

          // WEBRTC ANSWER.
          if (data.type === "answer") {
            if (!remoteId || remoteId === localPeerId) return;

            if (
              data.target_peer_id != null &&
              String(data.target_peer_id) !== localPeerId
            ) {
              return;
            }

            try {
              const peer = peerConnectionsRef.current[remoteId];

              if (
                !peer ||
                peer.signalingState !== "have-local-offer"
              ) {
                return;
              }

              await peer.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );

              if (!isCurrentSocket()) return;

              await addPendingCandidates(peer, remoteId);
            } catch (error) {
              console.error("Could not handle WebRTC answer:", error);
            }
            return;
          }

          // ICE CANDIDATE.
          if (data.type === "ice-candidate") {
            if (!remoteId || remoteId === localPeerId) return;

            if (
              data.target_peer_id != null &&
              String(data.target_peer_id) !== localPeerId
            ) {
              return;
            }

            if (!data.candidate) return;

            const peer = peerConnectionsRef.current[remoteId];

            if (!peer || !peer.remoteDescription) {
              if (!pendingCandidatesRef.current[remoteId]) {
                pendingCandidatesRef.current[remoteId] = [];
              }

              pendingCandidatesRef.current[remoteId].push(
                data.candidate
              );
              return;
            }

            try {
              await peer.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
            } catch (error) {
              console.warn("Could not add ICE candidate:", error);
            }
          }
        } catch (error) {
          console.error("Socket message handling error:", error);
        }
      };

      return socket;
    },
    [
      createPeerConnection,
      onChatMessage,
      peerConnectionsRef,
      peerIdRef,
      pendingCandidatesRef,
      remoteVideosRef,
      setRemoteParticipants,
      setSocketConnected,
    ]
  );

  const disconnectSocket = useCallback(() => {
    const socket = socketRef.current;

    if (socket) {
      socketRef.current = null;

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "leave" }));
        }

        socket.close();
      } catch (error) {
        console.warn("Could not close classroom socket:", error);
      }
    }

    setSocketConnected(false);
  }, [setSocketConnected]);

  return {
    socketRef,
    connectSocket,
    disconnectSocket,
    sendSocketMessage: sendThroughSocket,
  };
}
