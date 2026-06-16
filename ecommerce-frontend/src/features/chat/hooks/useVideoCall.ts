import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

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

export function useVideoCall() {
  const { user } = useAuthStore();
  const { call, startCall, acceptCall, endCall } = useChatStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socket = getSocket();

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const closePeerConnection = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    hasRemoteDescRef.current = false;
    pendingCandidatesRef.current = [];
  }, []);

  const cleanupCall = useCallback(() => {
    stopLocalStream();
    closePeerConnection();
    setLocalStream(null);
    setRemoteStream(null);
    endCall();
  }, [stopLocalStream, closePeerConnection, endCall]);

  // Build RTCPeerConnection and attach local stream
  const createPeerConnection = useCallback((localStream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate && call.conversationId && call.callId) {
        socket.emit('webrtc_signal', {
          conversationId: call.conversationId,
          callId: call.callId,
          signal: { type: 'candidate', candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      setRemoteStream(e.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall();
      }
    };

    return pc;
  }, [call.conversationId, call.callId, socket, cleanupCall]);

  const flushPendingCandidates = useCallback(async () => {
    if (!pcRef.current || !hasRemoteDescRef.current) return;
    for (const c of pendingCandidatesRef.current) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidatesRef.current = [];
  }, []);

  // ── Initiate a call ───────────────────────────────────────────────────────
  const initiateCall = useCallback(async (
    conversationId: string,
    callType: 'video' | 'audio' = 'video',
  ) => {
    if (!user) return;
    const callId = crypto.randomUUID();

    // Get local media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    startCall(conversationId, callId, callType);

    const pc = createPeerConnection(stream);

    // Re-wire onicecandidate with correct callId/conversationId
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc_signal', { conversationId, callId, signal: { type: 'candidate', candidate: e.candidate } });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call_initiate', {
      conversationId,
      callId,
      callType,
      callerName: user.fullName || user.email || 'Người dùng',
      offer,
    });
  }, [user, startCall, createPeerConnection, socket]);

  // ── Accept incoming call ──────────────────────────────────────────────────
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!call.conversationId || !call.callId) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: call.callType === 'video',
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection(stream);

    // Re-wire correctly
    const convId = call.conversationId;
    const cId = call.callId;
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc_signal', { conversationId: convId, callId: cId, signal: { type: 'candidate', candidate: e.candidate } });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    hasRemoteDescRef.current = true;
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('call_answer', { conversationId: convId, callId: cId, answer });
    acceptCall();
  }, [call.conversationId, call.callId, call.callType, createPeerConnection, socket, acceptCall, flushPendingCandidates]);

  // ── Handle answer from callee (initiator side) ────────────────────────────
  const handleCallAnswered = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    hasRemoteDescRef.current = true;
    await flushPendingCandidates();
    acceptCall();
  }, [acceptCall, flushPendingCandidates]);

  // ── Handle incoming ICE candidate ─────────────────────────────────────────
  const handleSignal = useCallback(async (signal: { type: string; candidate?: RTCIceCandidateInit; sdp?: string }) => {
    if (signal.type === 'candidate' && signal.candidate) {
      if (pcRef.current && hasRemoteDescRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
      } else {
        pendingCandidatesRef.current.push(signal.candidate);
      }
    }
  }, []);

  // ── Hang up ───────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    if (call.conversationId && call.callId) {
      const duration = call.answeredAt
        ? Math.floor((Date.now() - call.answeredAt) / 1000)
        : 0;
      socket.emit('call_end', {
        conversationId: call.conversationId,
        callId: call.callId,
        duration,
      });
    }
    cleanupCall();
  }, [call.conversationId, call.callId, call.answeredAt, socket, cleanupCall]);

  // ── Reject incoming call ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (call.conversationId && call.callId) {
      socket.emit('call_reject', { conversationId: call.conversationId, callId: call.callId });
    }
    cleanupCall();
  }, [call.conversationId, call.callId, socket, cleanupCall]);

  // ── Toggle mute / camera ──────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalStream();
      closePeerConnection();
    };
  }, [stopLocalStream, closePeerConnection]);

  return {
    call,
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    localStream,
    remoteStream,
    initiateCall,
    answerCall,
    handleCallAnswered,
    handleSignal,
    hangUp,
    rejectCall,
    toggleMute,
    toggleCamera,
    cleanupCall,
  };
}
