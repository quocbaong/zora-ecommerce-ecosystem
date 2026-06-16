import { useEffect, useRef, useCallback, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';
import socketService from '../../../services/socket/socketService';
import { useAuthStore } from '../../../contexts/authContext';
import { useGroupCallStore, GroupParticipant } from '../../../store/groupCallStore';
import { useGroupStore } from '../../../store/groupStore';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
};

export function useGroupCall() {
  const { user } = useAuthStore();
  const { startGroupCall, receiveGroupCall, joinedGroupCall, endGroupCall, updateParticipantStream, removeParticipant, setParticipants } = useGroupCallStore();

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Map<string, any[]>>(new Map());
  const remoteDescsRef = useRef<Set<string>>(new Set());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Keep a ref in sync with store state to avoid stale closures in listeners
  const storeRef = useRef(useGroupCallStore.getState());
  useEffect(() => {
    storeRef.current = useGroupCallStore.getState();
  });

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteDescsRef.current.clear();
  }, []);

  const cleanupGroupCall = useCallback(() => {
    const { groupId, callId, callType } = useGroupCallStore.getState();
    if (groupId && callId) {
      socketService.socket?.emit('group_call_leave', { groupId, callId });
      // Optimistically assume others are still in the call → show Join button
      // Server will send group_call_ended to clear this if the room is now empty
      useGroupCallStore.getState().setActiveCallInfo(groupId, {
        groupId,
        callId,
        callType,
        startedAt: new Date(),
      });
      setTimeout(() => socketService.queryActiveGroupCall(groupId), 500);
    }
    stopLocalStream();
    closeAllPeerConnections();
    endGroupCall();
  }, [stopLocalStream, closeAllPeerConnections, endGroupCall]);

  const getLocalMedia = useCallback(async (callType: 'video' | 'audio') => {
    try {
      const stream = await mediaDevices.getUserMedia({
        video: callType === 'video' ? {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user'
        } : false,
        audio: true,
      });
      localStreamRef.current = stream as any;
      setLocalStream(stream as any);
      return stream as any;
    } catch (e) {
      console.warn('[GCALL] Failed to get local media', e);
      return null;
    }
  }, []);

  const buildPeerConnection = useCallback((peerId: string, peerName: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS as any);
    pcsRef.current.set(peerId, pc);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        pc.addTrack(t, localStreamRef.current!);
      });
    }

    (pc as any).onicecandidate = (e: any) => {
      if (!e.candidate) return;
      const { groupId, callId } = storeRef.current;
      socketService.socket?.emit('group_webrtc_signal', {
        groupId,
        callId,
        targetUserId: peerId,
        signal: { type: 'candidate', candidate: e.candidate },
      });
    };

    (pc as any).ontrack = (e: any) => {
      if (e.streams && e.streams[0]) {
        console.log(`[GCALL] ontrack Received stream for peer ${peerId} (${peerName})`);
        const existingName = storeRef.current.participants[peerId]?.name || peerName;
        updateParticipantStream(peerId, e.streams[0].toURL(), existingName);
      } else {
        console.warn(`[GCALL] ontrack fired but no streams for peer ${peerId}`);
      }
    };

    (pc as any).onaddstream = (e: any) => {
      const stream = e.stream;
      if (!stream) return;
      console.log(`[GCALL] onaddstream Received stream for peer ${peerId} (${peerName})`);
      const existingName = storeRef.current.participants[peerId]?.name || peerName;
      updateParticipantStream(peerId, stream.toURL(), existingName);
    };

    (pc as any).onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[GCALL] PC ${peerId} state:`, state);
      
      if (state === 'failed') {
        console.warn(`[GCALL] PC ${peerId} failed, waiting 10s grace period...`);
        setTimeout(() => {
          if (pcsRef.current.get(peerId)?.connectionState === 'failed') {
            console.error(`[GCALL] PC ${peerId} failed permanently, removing`);
            removeParticipant(peerId);
            pc.close();
            pcsRef.current.delete(peerId);
          }
        }, 10000);
      } else if (state === 'disconnected') {
        console.warn(`[GCALL] PC ${peerId} disconnected, waiting for recovery...`);
      }
    };

    return pc;
  }, [updateParticipantStream, removeParticipant]);

  const flushPending = useCallback(async (peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc || !remoteDescsRef.current.has(peerId)) return;
    
    const candidates = pendingCandidatesRef.current.get(peerId) ?? [];
    for (const c of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { /* ignore */ }
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  // ── Initiate a new group call ──────────────────────────────────────────────
  const initiateGroupCall = useCallback(async (
    groupId: string,
    groupName: string,
    callType: 'video' | 'audio' = 'video',
  ) => {
    if (!user) return;
    const callId = `gcall_${Date.now()}`;
    const stream = await getLocalMedia(callType);
    if (!stream) return;

    startGroupCall(groupId, groupName, callId, callType);
    socketService.socket?.emit('group_call_initiate', {
      groupId,
      callId,
      callType,
      callerName: user.fullName || 'Người dùng',
    });
  }, [user, getLocalMedia, startGroupCall]);

  // ── Join an existing group call ────────────────────────────────────────────
  const joinGroupCall = useCallback(async (
    groupId: string,
    callId: string,
    callType: 'video' | 'audio',
    groupName?: string,
  ) => {
    if (!user) return;
    const stream = await getLocalMedia(callType);
    if (!stream) return;

    joinedGroupCall(groupId, groupName || 'Nhóm', callId, callType);
    // Remove from activeCallsByGroup since we're now joining
    useGroupCallStore.getState().setActiveCallInfo(groupId, null);
    socketService.socket?.emit('group_call_join', {
      groupId,
      callId,
      userName: user.fullName || 'Người dùng',
    });
  }, [user, getLocalMedia, joinedGroupCall]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const onParticipantJoined = async (data: any) => {
      const { callId, groupId, status } = storeRef.current;
      if (data.callId !== callId || data.groupId !== groupId) return;

      if (data.userId === user?.id) {
        if (data.existingParticipants) {
          data.existingParticipants.forEach((p: any) => {
            updateParticipantStream(p.userId, null, p.userName || p.userId);
          });
        }
        return;
      }
      
      console.log(`[GCALL] User ${data.userId} joined call`);
      updateParticipantStream(data.userId, null, data.userName || data.userId);

      if (status !== 'in_call') return;
      console.log(`[GCALL] ${data.userName} joined, initiating handshake...`);
      
      const pc = buildPeerConnection(data.userId, data.userName);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('group_webrtc_signal', {
        groupId: data.groupId,
        callId: data.callId,
        targetUserId: data.userId,
        signal: offer,
      });
    };

    const onParticipantLeft = (data: any) => {
      const { callId } = storeRef.current;
      if (data.callId !== callId) return;
      removeParticipant(data.userId);
      const pc = pcsRef.current.get(data.userId);
      if (pc) { pc.close(); pcsRef.current.delete(data.userId); }
    };

    const onCallEnded = (data: any) => {
      const { callId } = storeRef.current;
      if (data.callId !== callId) return;
      cleanupGroupCall();
    };


    const onWebrtcSignal = async (data: any) => {
      const { callId, groupId } = storeRef.current;
      if (data.callId !== callId || data.groupId !== groupId) return;

      const fromUserId = data.fromUserId;
      const signal = data.signal;
      if (!fromUserId) return;

      if (!storeRef.current.participants[fromUserId]) {
        updateParticipantStream(fromUserId, null, fromUserId);
      }

      if (signal.type === 'offer') {
        let pc = pcsRef.current.get(fromUserId);
        if (!pc) {
          const name = storeRef.current.participants[fromUserId]?.name || fromUserId;
          pc = buildPeerConnection(fromUserId, name);
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
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) { /* ignore */ }
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
    socket.on('group_webrtc_signal', onWebrtcSignal);

    return () => {
      socket.off('group_call_participant_joined', onParticipantJoined);
      socket.off('group_call_participant_left', onParticipantLeft);
      socket.off('group_call_ended', onCallEnded);
      socket.off('group_webrtc_signal', onWebrtcSignal);
    };
  }, [user?.id, buildPeerConnection, flushPending, cleanupGroupCall, setParticipants, updateParticipantStream, removeParticipant]);

  useEffect(() => {
    return () => {
      stopLocalStream();
      closeAllPeerConnections();
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getAudioTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        setIsMuted(!t.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getVideoTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        setIsVideoOff(!t.enabled);
      }
    }
  }, []);

  const switchCamera = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getVideoTracks()[0];
      if (t) {
        (t as any)._switchCamera();
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      }
    }
  }, []);

  const toggleSpeakerphone = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  return {
    localStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    facingMode,
    initiateGroupCall,
    joinGroupCall,
    cleanupGroupCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleSpeakerphone,
  };
}
