import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';
import socketService from '../../../services/socket/socketService';
import { useChatStore } from '../../../store/chatStore';
import { useAuthStore } from '../../../contexts/authContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // Giữ lại STUN của Google làm backup
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'ca00917e7728d500c1678bb1',
      credential: 'V+wBI4fArc4VPJEz',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: 'ca00917e7728d500c1678bb1',
      credential: 'V+wBI4fArc4VPJEz',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'ca00917e7728d500c1678bb1',
      credential: 'V+wBI4fArc4VPJEz',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: 'ca00917e7728d500c1678bb1',
      credential: 'V+wBI4fArc4VPJEz',
    },
  ],
  iceCandidatePoolSize: 10,
};

export const useVideoCall = () => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescRef = useRef(false);
  const hasAppliedAnswerRef = useRef(false);
  
  const callState = useChatStore(state => state.call);

  // Group Call robust states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');



  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStreamURL(null);
    hasRemoteDescRef.current = false;
    pendingCandidatesRef.current = [];
  }, [localStream]);

  const endSession = useCallback(() => {
    const { conversationId, callId, answeredAt } = useChatStore.getState().call;
    const duration = answeredAt ? Math.floor((Date.now() - answeredAt) / 1000) : 0;

    if (conversationId && callId) {
      socketService.socket?.emit('call_end', { 
        conversationId,
        callId,
        duration
      });
    }
    
    cleanup();
    useChatStore.getState().endCall();
  }, [cleanup]);

  const flushPendingCandidates = async (pc: RTCPeerConnection) => {
    if (!hasRemoteDescRef.current) return;
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[CALL] Failed to add pending candidate', e);
      }
    }
    pendingCandidatesRef.current = [];
  };

  const requestMediaPermissions = async (isVideo: boolean) => {
    if (Platform.OS !== 'android') return true;
    try {
      const permsToRequest = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      if (isVideo) permsToRequest.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      const result = await PermissionsAndroid.requestMultiple(permsToRequest);
      const allGranted = permsToRequest.every(p => result[p] === PermissionsAndroid.RESULTS.GRANTED);
      if (!allGranted) {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập Camera và Micro để thực hiện cuộc gọi. Vui lòng cấp quyền trong Cài đặt.');
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[CALL] Permission request error', e);
      return false;
    }
  };

  const setupMediaStream = async (isVideo: boolean = true) => {
    console.log('[CALL] setupMediaStream isVideo:', isVideo);
    try {
      // Set up audio mode first (earpiece default, can switch to speaker)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: true, // earpiece by default
      });

      const hasPermission = await requestMediaPermissions(isVideo);
      console.log('[CALL] Permission granted:', hasPermission);
      if (!hasPermission) return null;

      console.log('[CALL] Calling getUserMedia...');
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user'
        } : false
      });
      console.log('[CALL] Got stream, tracks:', (stream as any).getTracks().length);
      setLocalStream(stream as any);
      return stream as any;
    } catch (e: any) {
      console.warn('[CALL] getUserMedia FAILED:', e?.name, e?.message);
      return null;
    }
  };

  const createPeerConnection = (stream: MediaStream, conversationId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS as any);
    
    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    (pc as any).ontrack = (event: any) => {
      console.log('[CALL] ontrack event received');
      if (event.streams && event.streams[0]) {
        console.log('[CALL] Received remote stream from streams[0]');
        setRemoteStreamURL(event.streams[0].toURL());
      } else if (event.track) {
        console.log('[CALL] Received remote track fall-back processing');
        const newStream = new (MediaStream as any)([event.track]);
        setRemoteStreamURL(newStream.toURL());
      }
    };

    // Legacy fallback for robust streaming
    (pc as any).onaddstream = (event: any) => {
      const stream = event.stream;
      if (!stream) return;
      console.log('[CALL] onaddstream event received');
      setRemoteStreamURL(stream.toURL());
    };

    // Handle ICE Candidates — log type to confirm TURN relay is working
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        const type = event.candidate.type || event.candidate.candidate?.split(' ')[7] || 'unknown';
        console.log('[CALL] ICE candidate generated, type:', type);
        if (useChatStore.getState().call.callId) {
          socketService.socket?.emit('webrtc_signal', {
            conversationId,
            callId: useChatStore.getState().call.callId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      }
    };

    (pc as any).onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[CALL] Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('[CALL] ✅ WebRTC connected successfully!');
      } else if (state === 'failed') {
        // Hard failure: wait 10s before ending to allow for potential ICE restart/recovery
        console.warn('[CALL] ❌ Connection failed, starting 10s grace period...');
        const timerId = setTimeout(() => {
          if (pcRef.current?.connectionState === 'failed') {
            console.error('[CALL] Connection failed permanently, ending session');
            endSession();
          }
        }, 10000);
        return () => clearTimeout(timerId);
      } else if (state === 'disconnected') {
        // Transient disconnection: log but don't end. 
        // WebRTC will try to reconnect automatically (ICE restart or new candidates).
        console.warn('[CALL] ⚠️ Connection disconnected (transient), waiting for auto-recovery...');
      } else if (state === 'closed') {
        console.log('[CALL] Connection closed');
      }
    };

    pcRef.current = pc;
    return pc;
  };

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const handleSignal = async (data: any) => {
      const { signal } = data;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          hasRemoteDescRef.current = true;
          await flushPendingCandidates(pc);
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc_signal', {
            conversationId: data.conversationId,
            callId: data.callId || callState.callId,
            signal: answer
          });
        } else if (signal.type === 'answer') {
          console.log('[CALL] Received answer signal via webrtc_signal, applying to PC and Store...');
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          hasRemoteDescRef.current = true;
          await flushPendingCandidates(pc);
          
          // CRITICAL: Ensure store status is updated to 'in_call' so UI leaves 'Ringing' state
          if (useChatStore.getState().call.callStatus !== 'in_call') {
            console.log('[CALL] Syncing store status to in_call via answer signal');
            useChatStore.getState().acceptCall(signal);
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (hasRemoteDescRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        } else if (signal.type === 'camera_status') {
          useChatStore.getState().setRemoteCameraOff(!signal.enabled);
        }
      } catch (e) {
        console.warn('WebRTC signal error', e);
      }
    };

    socket.on('webrtc_signal', handleSignal);
    
    // Direct listener for call_answered to ensure we don't miss it
    socket.on('call_answered', async (data: any) => {
      console.log('[CALL] Direct call_answered signal received:', { callId: data.callId });
      if (data.answer && pcRef.current && !hasRemoteDescRef.current) {
        try {
          console.log('[CALL] Applying remote answer immediately...');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          hasRemoteDescRef.current = true;
          await flushPendingCandidates(pcRef.current);
          
          if (useChatStore.getState().call.callStatus !== 'in_call') {
            useChatStore.getState().acceptCall(data.answer);
          }
        } catch (e) {
          console.warn('[CALL] Error applying direct answer', e);
        }
      }
    });

    socket.on('call_ended', () => {
      console.log('[CALL] Direct call_ended signal received');
      endSession();
    });

    socket.on('call_rejected', () => {
      console.log('[CALL] Direct call_rejected signal received');
      endSession();
    });

    return () => {
      socket.off('webrtc_signal', handleSignal);
      socket.off('call_answered');
      socket.off('call_ended');
      socket.off('call_rejected');
    };
  }, [callState.callId, endSession]);



  const makeCall = async (conversationId: string, isVideo: boolean) => {
    console.log('[CALL] Initiating call to:', conversationId);
    const callId = `call_${Date.now()}`;
    
    // CRITICAL: Must join conversation room to receive ICE candidates from the other peer
    socketService.joinConversation(conversationId);
    
    useChatStore.getState().startCall(conversationId, callId, isVideo ? 'video' : 'audio');

    const stream = await setupMediaStream(isVideo);
    if (!stream) {
      useChatStore.getState().endCall();
      return;
    }
    
    const pc = createPeerConnection(stream, conversationId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const currentUser = useAuthStore.getState().user;
      
      socketService.socket?.emit('call_initiate', { 
        conversationId, 
        callType: isVideo ? 'video' : 'audio', 
        callId,
        offer,
        callerName: currentUser?.fullName || 'Người dùng'
      });
    } catch (e) {
      console.warn('[CALL] Initiate call failed', e);
      endSession();
    }
  };

  const answerCall = async () => {
    // Read DIRECTLY from store to avoid stale closure
    const liveCall = useChatStore.getState().call;
    console.log('[CALL] answerCall → conversationId:', liveCall.conversationId, 'offer:', !!liveCall.offer, 'callType:', liveCall.callType);
    
    // CRITICAL: Must join conversation room to receive ICE candidates from the initiator
    if (liveCall.conversationId) {
      socketService.joinConversation(liveCall.conversationId);
    }
    
    if (!liveCall.conversationId || !liveCall.offer) {
      console.warn('[CALL] answerCall aborted — missing conversationId or offer');
      return;
    }
    const stream = await setupMediaStream(liveCall.callType === 'video');
    if (!stream) {
      console.warn('[CALL] answerCall aborted — no stream');
      return;
    }

    const pc = createPeerConnection(stream, liveCall.conversationId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(liveCall.offer));
      hasRemoteDescRef.current = true;
      await flushPendingCandidates(pc);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      useChatStore.getState().acceptCall(answer);
      socketService.socket?.emit('call_answer', { 
        conversationId: liveCall.conversationId, 
        callId: liveCall.callId,
        answer
      });
      console.log('[CALL] answerCall success — sent call_answer');
    } catch (e) {
      console.warn('Answer call failed', e);
      endSession();
    }
  };



  const rejectCall = () => {
    const { conversationId, callId } = useChatStore.getState().call;
    if (conversationId && callId) {
      socketService.socket?.emit('call_reject', { conversationId, callId });
    }
    cleanup();
    useChatStore.getState().endCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);

        // Notify other side
        if (callState.conversationId && callState.callId) {
          socketService.socket?.emit('webrtc_signal', {
            conversationId: callState.conversationId,
            callId: callState.callId,
            signal: { type: 'camera_status', enabled: videoTrack.enabled }
          });
        }
      }
    }
  };

  const switchCamera = useCallback(() => {
    try {
      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any)._switchCamera === 'function') {
        (videoTrack as any)._switchCamera();
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      }
    } catch (e) {
      console.warn('[CALL] switchCamera error', e);
    }
  }, [localStream]);

  const toggleSpeakerphone = async () => {
    const next = !isSpeakerOn;
    try {
      if (Platform.OS === 'ios') {
        // On iOS: expo-av audio mode works well with WebRTC
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      }
      // On Android: WebRTC manages its own audio session.
      // Calling setAudioModeAsync disrupts the audio pipeline.
      // Speaker routing on Android is managed by the system based on the
      // setSpeakerphoneOn() API — react-native-webrtc handles this internally.
      // We just update UI state here.
      console.log('[CALL] Speaker mode toggled (UI):', next ? 'loudspeaker' : 'earpiece');
    } catch (e) {
      console.warn('[CALL] Speaker toggle error', e);
    }
    setIsSpeakerOn(next);
  };

  return {
    localStream,
    remoteStreamURL,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    facingMode,
    makeCall,
    answerCall,
    rejectCall,
    endSession,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeakerphone
  };
};
