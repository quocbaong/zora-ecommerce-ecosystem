import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { useGroupCallStore } from '@/stores/groupCallStore';
import { useGroupStore } from '@/stores/groupStore';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export interface GroupParticipant {
  userId: string;
  name: string;
  stream: MediaStream | null;
}

export function useGroupCall() {
  const { user } = useAuthStore();
  const { startGroupCall, receiveGroupCall, joinedGroupCall, endGroupCall, setActiveCallForGroup } = useGroupCallStore();

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescsRef = useRef<Set<string>>(new Set());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Record<string, GroupParticipant>>({});

  // Keep a ref in sync with participants state so socket handlers never
  // need `participants` in their deps (avoids constant listener re-registration).
  const participantsRef = useRef<Record<string, GroupParticipant>>({});
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteDescsRef.current.clear();
  }, []);

  const cleanupGroupCall = useCallback(() => {
    const { groupId, callId } = useGroupCallStore.getState();
    if (groupId && callId) {
      const socket = getSocket();
      socket?.emit('group_call_leave', { groupId, callId });
      // Re-query active call status so the "Tham gia" button reappears if other
      // participants are still in the call. Small delay lets the server process
      // our leave first so it can report accurate participant count.
      setTimeout(() => socket?.emit('group_query_active_call', { groupId }), 300);
    }
    stopLocalStream();
    closeAllPeerConnections();
    setParticipants({});
    endGroupCall();
  }, [stopLocalStream, closeAllPeerConnections, endGroupCall]);

  const getLocalMedia = useCallback(async (callType: 'video' | 'audio') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const buildPeerConnection = useCallback((peerId: string, peerName: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current.set(peerId, pc);

    // Add all local tracks to the new peer connection
    localStreamRef.current?.getTracks().forEach((t) => {
      pc.addTrack(t, localStreamRef.current!);
    });

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const { groupId, callId } = useGroupCallStore.getState();
      getSocket()?.emit('group_webrtc_signal', {
        groupId,
        callId,
        targetUserId: peerId,
        signal: { type: 'candidate', candidate: e.candidate },
      });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;
      setParticipants((prev) => ({
        ...prev,
        [peerId]: { userId: peerId, name: prev[peerId]?.name ?? peerName, stream },
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setParticipants((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        pc.close();
        pcsRef.current.delete(peerId);
      }
    };

    return pc;
  }, []);

  const flushPending = useCallback(async (peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc || !remoteDescsRef.current.has(peerId)) return;
    for (const c of pendingCandidatesRef.current.get(peerId) ?? []) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  // ── Query whether a group has an active call (for late joiners) ───────────
  const queryActiveCall = useCallback((groupId: string) => {
    getSocket()?.emit('group_query_active_call', { groupId });
  }, []);

  // ── Initiate a new group call ──────────────────────────────────────────────
  const initiateGroupCall = useCallback(async (
    groupId: string,
    groupName: string,
    callType: 'video' | 'audio' = 'video',
  ) => {
    if (!user) return;
    // Block starting a new call if one is already active in this group
    const activeCall = useGroupCallStore.getState().activeCallsByGroup[groupId];
    if (activeCall) return;
    const callId = crypto.randomUUID();
    await getLocalMedia(callType);
    startGroupCall(groupId, groupName, callId, callType);
    getSocket()?.emit('group_call_initiate', {
      groupId,
      callId,
      callType,
      callerName: user.fullName || user.email || 'Người dùng',
    });
  }, [user, getLocalMedia, startGroupCall]);

  // ── Join an existing group call ────────────────────────────────────────────
  const joinGroupCall = useCallback(async (
    groupId: string,
    groupName: string,
    callId: string,
    callType: 'video' | 'audio',
  ) => {
    if (!user) return;
    await getLocalMedia(callType);
    joinedGroupCall(groupId, groupName, callId, callType);
    // Remove from activeCallsByGroup since we're now joining
    setActiveCallForGroup(groupId, null);
    getSocket()?.emit('group_call_join', {
      groupId,
      callId,
      userName: user.fullName || user.email || 'Người dùng',
    });
  }, [user, getLocalMedia, joinedGroupCall, setActiveCallForGroup]);

  // ── Toggle audio / video ───────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  // ── Socket event handlers ──────────────────────────────────────────────────
  // IMPORTANT: `participants` must NOT be in this effect's deps.
  // We use `participantsRef` for reads inside handlers to avoid constantly
  // tearing down and re-registering listeners (which drops ICE candidates).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Another participant joined the call
    const onParticipantJoined = async (data: {
      groupId: string;
      callId: string;
      userId: string;
      userName: string;
      existingParticipants?: { userId: string; userName: string }[];
    }) => {
      const { callId, groupId, status } = useGroupCallStore.getState();
      if (data.callId !== callId || data.groupId !== groupId) return;

      if (data.userId === user?.id) {
        // We just joined — server sent us the list of existing participants.
        // Add placeholder entries in ONE batched update.
        if (data.existingParticipants && data.existingParticipants.length > 0) {
          const entries: Record<string, GroupParticipant> = {};
          data.existingParticipants.forEach((p) => {
            entries[p.userId] = { userId: p.userId, name: p.userName, stream: null };
          });
          setParticipants((prev) => ({ ...prev, ...entries }));
        }
        // Existing participants will detect our join and send us offers.
        return;
      }

      // Someone else joined — if we're in the call, create a peer connection
      // and send them an offer so they receive our stream.
      if (status !== 'in_call') return;

      // Add placeholder (stream will arrive via ontrack)
      setParticipants((prev) => ({
        ...prev,
        [data.userId]: { userId: data.userId, name: data.userName, stream: null },
      }));

      const pc = buildPeerConnection(data.userId, data.userName);
      // Override onicecandidate with the correct callId/groupId captured from event data
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('group_webrtc_signal', {
            groupId: data.groupId,
            callId: data.callId,
            targetUserId: data.userId,
            signal: { type: 'candidate', candidate: e.candidate },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('group_webrtc_signal', {
        groupId: data.groupId,
        callId: data.callId,
        targetUserId: data.userId,
        signal: offer,
      });
    };

    // A participant left
    const onParticipantLeft = (data: { groupId: string; callId: string; userId: string }) => {
      const { callId } = useGroupCallStore.getState();
      if (data.callId !== callId) return;
      setParticipants((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      const pc = pcsRef.current.get(data.userId);
      if (pc) { pc.close(); pcsRef.current.delete(data.userId); }
    };

    // Call ended by last person leaving — emitted to group room so non-participants also know
    const onCallEnded = (data: { groupId: string; callId: string }) => {
      // Clear the active call tracker for this group (for non-participants)
      setActiveCallForGroup(data.groupId, null);
      const state = useGroupCallStore.getState();
      if (data.callId !== state.callId) return;
      stopLocalStream();
      closeAllPeerConnections();
      setParticipants({});
      endGroupCall();
    };

    // Backup mechanism: If we miss the group_call_ended event, the new_group_message (CALL type) will dismiss the ringing
    const onNewGroupMessage = (data: { groupId: string; message: any }) => {
      const msg = data.message;
      if (msg?.type === 'CALL' || msg?.type === 'GROUP_CALL') {
        try {
          const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
          if (content?.status === 'missed' || content?.status === 'ended') {
            const state = useGroupCallStore.getState();
            if (state.status === 'ringing' && state.groupId === data.groupId) {
              console.log('[GCALL] Backup: Missed call message received, dismissing ringing overlay');
              stopLocalStream();
              closeAllPeerConnections();
              setParticipants({});
              endGroupCall();
            }
          }
        } catch { /* ignore */ }
      }
    };

    // Incoming group call notification (this user is being invited)
    const onIncomingCall = (data: {
      groupId: string;
      groupName?: string;
      callId: string;
      callType: 'video' | 'audio';
      callerId: string;
      callerName: string;
    }) => {
      if (data.callerId === user?.id) return;
      // Track the active call for this group so any member can join later
      setActiveCallForGroup(data.groupId, {
        callId: data.callId,
        callType: data.callType,
        callerName: data.callerName,
      });
      const groupName = data.groupName || useGroupStore.getState().groups[data.groupId]?.name || data.groupId;
      receiveGroupCall(
        data.groupId,
        groupName,
        data.callId,
        data.callType,
        data.callerId,
        data.callerName,
      );
    };

    // Response to group_query_active_call (for late joiners who missed the initial notification)
    const onActiveCallStatus = (data: {
      groupId: string;
      active: boolean;
      callId?: string;
      callType?: 'video' | 'audio';
      callerName?: string;
    }) => {
      if (data.active && data.callId && data.callType) {
        // Only set if we're not already in this call
        const state = useGroupCallStore.getState();
        if (state.callId !== data.callId) {
          setActiveCallForGroup(data.groupId, {
            callId: data.callId,
            callType: data.callType,
            callerName: data.callerName || '',
          });
        }
      } else {
        setActiveCallForGroup(data.groupId, null);
      }
    };

    type GroupSignal =
      | { type: 'offer'; sdp: string }
      | { type: 'answer'; sdp: string }
      | { type: 'candidate'; candidate: RTCIceCandidateInit };

    // WebRTC signaling between specific participants
    const onWebrtcSignal = async (data: {
      groupId: string;
      callId: string;
      fromUserId: string;
      signal: GroupSignal;
    }) => {
      const { callId, groupId } = useGroupCallStore.getState();
      if (data.callId !== callId || data.groupId !== groupId) return;

      const { fromUserId, signal } = data;

      if (signal.type === 'offer') {
        let pc = pcsRef.current.get(fromUserId);
        if (!pc) {
          // Use participantsRef (not state) to avoid stale closure
          const name = participantsRef.current[fromUserId]?.name ?? fromUserId;
          pc = buildPeerConnection(fromUserId, name);
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              socket.emit('group_webrtc_signal', {
                groupId: data.groupId,
                callId: data.callId,
                targetUserId: fromUserId,
                signal: { type: 'candidate', candidate: e.candidate },
              });
            }
          };
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescsRef.current.add(fromUserId);
        await flushPending(fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('group_webrtc_signal', {
          groupId: data.groupId,
          callId: data.callId,
          targetUserId: fromUserId,
          signal: answer,
        });
      } else if (signal.type === 'answer') {
        const pc = pcsRef.current.get(fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescsRef.current.add(fromUserId);
        await flushPending(fromUserId);
      } else if (signal.type === 'candidate' && signal.candidate) {
        const pc = pcsRef.current.get(fromUserId);
        if (pc && remoteDescsRef.current.has(fromUserId)) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* ignore */ }
        } else {
          const pending = pendingCandidatesRef.current.get(fromUserId) ?? [];
          pending.push(signal.candidate);
          pendingCandidatesRef.current.set(fromUserId, pending);
        }
      }
    };

    socket.on('group_call_participant_joined', onParticipantJoined);
    socket.on('group_call_participant_left', onParticipantLeft);
    socket.on('group_call_ended', onCallEnded);
    socket.on('new_group_message', onNewGroupMessage);
    socket.on('group_incoming_call', onIncomingCall);
    socket.on('group_webrtc_signal', onWebrtcSignal);
    socket.on('group_active_call_status', onActiveCallStatus);

    return () => {
      socket.off('group_call_participant_joined', onParticipantJoined);
      socket.off('group_call_participant_left', onParticipantLeft);
      socket.off('group_call_ended', onCallEnded);
      socket.off('new_group_message', onNewGroupMessage);
      socket.off('group_incoming_call', onIncomingCall);
      socket.off('group_webrtc_signal', onWebrtcSignal);
      socket.off('group_active_call_status', onActiveCallStatus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, buildPeerConnection, flushPending, stopLocalStream, closeAllPeerConnections, endGroupCall, receiveGroupCall, setActiveCallForGroup]);
  // NOTE: `participants` intentionally excluded — we use `participantsRef` instead.

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalStream();
      closeAllPeerConnections();
    };
  }, []);

  return {
    localStream,
    participants,
    initiateGroupCall,
    joinGroupCall,
    cleanupGroupCall,
    toggleMute,
    toggleCamera,
    queryActiveCall,
  };
}
