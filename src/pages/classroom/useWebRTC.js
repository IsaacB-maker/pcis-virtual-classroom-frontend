
import { useRef, useState, useCallback } from "react";

const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export function useWebRTC({ streamRef, sendSocketMessage }) {
  const peerConnectionsRef = useRef({});
  const remoteVideosRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const remoteStreamsRef = useRef({});

  const peerIdRef = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [remoteParticipants, setRemoteParticipants] = useState([]);

  const removeRemoteParticipant = useCallback((peerId) => {
    const id = String(peerId);
    const peer = peerConnectionsRef.current[id];

    if (peer) {
      // Prevent the close event from triggering duplicate cleanup.
      peer.onconnectionstatechange = null;
      peer.onicecandidate = null;
      peer.ontrack = null;

      try {
        peer.close();
      } catch {
        // The connection may already be closed.
      }

      delete peerConnectionsRef.current[id];
    }

    delete remoteVideosRef.current[id];
    delete pendingCandidatesRef.current[id];
    delete remoteStreamsRef.current[id];

    setRemoteParticipants((participants) =>
      participants.filter(
        (participant) => String(participant.peerId) !== id
      )
    );
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((peer) => {
      if (!peer) return;

      peer.onconnectionstatechange = null;
      peer.onicecandidate = null;
      peer.ontrack = null;

      try {
        peer.close();
      } catch {
        // Ignore connections that have already closed.
      }
    });

    peerConnectionsRef.current = {};
    remoteVideosRef.current = {};
    pendingCandidatesRef.current = {};
    remoteStreamsRef.current = {};

    setRemoteParticipants([]);
  }, []);

  /*
   * Update the local camera and microphone tracks on existing
   * peer connections without destroying those connections.
   *
   * This is important when media starts after a participant
   * has already joined, or when a device is replaced.
   */
  const syncLocalTracksToPeerConnections = useCallback(async () => {
    const localStream = streamRef.current;

    const localTracks = localStream
      ? localStream.getTracks()
      : [];

    const peers = Object.values(peerConnectionsRef.current);

    await Promise.all(
      peers.map(async (peer) => {
        if (
          !peer ||
          peer.signalingState === "closed"
        ) {
          return;
        }

        const senders = peer.getSenders();

        for (const kind of ["audio", "video"]) {
          const track =
            localTracks.find(
              (localTrack) => localTrack.kind === kind
            ) || null;

          const sender = senders.find(
            (existingSender) =>
              existingSender.track?.kind === kind
          );

          if (sender) {
            if (sender.track !== track) {
              try {
                await sender.replaceTrack(track);
              } catch (error) {
                console.error(
                  `Could not update local ${kind} track:`,
                  error
                );
              }
            }

            continue;
          }

          /*
           * This is a fallback for connections created without
           * a sender for this media kind.
           *
           * Adding a new sender may require renegotiation, so
           * the main conference/socket flow must handle that
           * case if it occurs.
           */
          if (track && localStream) {
            try {
              peer.addTrack(track, localStream);
            } catch (error) {
              console.error(
                `Could not add local ${kind} track:`,
                error
              );
            }
          }
        }
      })
    );
  }, [streamRef]);

  const createPeerConnection = useCallback(
    (remotePeerId) => {
      const id = String(remotePeerId);

      const existingPeer = peerConnectionsRef.current[id];

      if (
        existingPeer &&
        existingPeer.signalingState !== "closed"
      ) {
        return existingPeer;
      }

      const peer = new RTCPeerConnection(RTC_CONFIGURATION);

      peerConnectionsRef.current[id] = peer;
      pendingCandidatesRef.current[id] = [];

      /*
       * Create audio and video senders from the beginning.
       * This allows local tracks to be attached later without
       * requiring a new peer connection.
       */
      const localStream = streamRef.current;

      for (const kind of ["audio", "video"]) {
        const track = localStream
          ?.getTracks()
          .find((localTrack) => localTrack.kind === kind);

        const transceiver = peer.addTransceiver(kind, {
          direction: "sendrecv",
        });

        if (track) {
          transceiver.sender.replaceTrack(track).catch((error) => {
            console.error(
              `Could not attach local ${kind} track:`,
              error
            );
          });
        }
      }

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;

        if (
          peerConnectionsRef.current[id] !== peer ||
          peer.signalingState === "closed"
        ) {
          return;
        }

        sendSocketMessage({
          type: "ice-candidate",
          peer_id: peerIdRef.current,
          target_peer_id: id,
          candidate: event.candidate,
        });
      };

      peer.ontrack = (event) => {
        if (peerConnectionsRef.current[id] !== peer) {
          return;
        }

        let remoteStream =
          event.streams?.[0] ||
          remoteStreamsRef.current[id];

        /*
         * Some WebRTC connections deliver a track without
         * event.streams. Build a stream in that situation.
         */
        if (!remoteStream) {
          remoteStream = new MediaStream();
          remoteStreamsRef.current[id] = remoteStream;
        }

        if (
          !remoteStream
            .getTracks()
            .some((track) => track.id === event.track.id)
        ) {
          remoteStream.addTrack(event.track);
        }

        remoteVideosRef.current[id] = remoteStream;

        setRemoteParticipants((participants) => {
          const existing = participants.find(
            (participant) =>
              String(participant.peerId) === id
          );

          if (existing) {
            return participants.map((participant) =>
              String(participant.peerId) === id
                ? {
                    ...participant,
                    stream: remoteStream,
                  }
                : participant
            );
          }

          return [
            ...participants,
            {
              peerId: id,
              name: "Participant",
              role: "student",
              stream: remoteStream,
              cameraOn: true,
              microphoneOn: true,
            },
          ];
        });
      };

      peer.onconnectionstatechange = () => {
        if (
          peer.connectionState === "failed" ||
          peer.connectionState === "closed"
        ) {
          if (peerConnectionsRef.current[id] === peer) {
            removeRemoteParticipant(id);
          }
        }

        /*
         * A temporarily disconnected connection is retained
         * so the browser can attempt ICE reconnection.
         */
      };

      return peer;
    },
    [
      removeRemoteParticipant,
      sendSocketMessage,
      streamRef,
    ]
  );

  return {
    peerConnectionsRef,
    remoteVideosRef,
    pendingCandidatesRef,
    peerIdRef,
    remoteParticipants,
    setRemoteParticipants,
    removeRemoteParticipant,
    closeAllPeerConnections,
    createPeerConnection,
    syncLocalTracksToPeerConnections,
  };
}
