import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Phone, PhoneOff, MicOff, Mic, VideoOff, Video as VideoIcon, Users, RefreshCcw, Volume2, VolumeX } from 'lucide-react-native';
import { useChatStore } from '../../../store/chatStore';
import { useVideoCall } from '../hooks/useVideoCall';
import { COLORS } from '../../../constants';
// expo-blur and expo-linear-gradient removed — not compatible with New Architecture (Fabric)
import { StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function VideoCallModal({ navigation, route }: any) {
  const params = route?.params; 
  const callState = useChatStore(state => state.call);
  
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
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
  } = useVideoCall();

  // Duration Timer
  useEffect(() => {
    if (callState.callStatus === 'in_call') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState.callStatus]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Track if we've entered an active call state
  const hasBeenActive = useRef(false);

  // If opened manually to initiate an outgoing call
  useEffect(() => {
    if (params?.conversationId && !params?.autoAnswer && callState.callStatus === 'idle') {
       makeCall(params.conversationId, params.callType === 'video');
    }
  }, [params?.conversationId]);

  // Auto-answer incoming call when navigated from GlobalCallOverlay
  // GlobalCallOverlay does NOT pre-change callStatus, so it will still be 'incoming'
  const navigationRef_local = useRef(navigation);

  useEffect(() => {
    navigationRef_local.current = navigation;
  }, [navigation]);

  useEffect(() => {
    if (callState.callStatus !== 'idle') {
      hasBeenActive.current = true;
    }
  }, [callState.callStatus]);

  useEffect(() => {
    const isIdle = callState.callStatus === 'idle';
    if (isIdle && hasBeenActive.current) {
      console.log('[CALL] Call ended, navigating back...');
      hasBeenActive.current = false; // Prevent repeated triggers
      try {
        if (navigationRef_local.current?.reset) {
          navigationRef_local.current.reset({
            index: 1,
            routes: [
              { name: 'ConversationList' },
              { name: 'ChatDetail', params: { conversationId: params?.conversationId || callState.conversationId } }
            ]
          });
        } else if (navigationRef_local.current?.canGoBack()) {
          navigationRef_local.current.goBack();
        }
      } catch (e) {
        console.warn('[CALL] Navigation error during goBack/replace', e);
      }
    }
  }, [callState.callStatus]);

  useEffect(() => {
    if (params?.autoAnswer) {
      console.log('[CALL] Auto-answering call...');
      // Small delay to ensure WebRTC is ready
      const t = setTimeout(() => {
        answerCall();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [params?.autoAnswer]);

  const handleEndCall = () => {
    endSession();
    try { if (navigation?.canGoBack()) navigation.goBack(); } catch (_) {}
  };

  const handleReject = () => {
    rejectCall();
    try { if (navigation?.canGoBack()) navigation.goBack(); } catch (_) {}
  };

  // Don't render if call is idle and we have no reason to be here
  if (callState.callStatus === 'idle' && !hasBeenActive.current && !params?.conversationId) {
    return null;
  }

  const isIncoming = callState.callStatus === 'incoming' && !callState.isInitiator;
  const isVideo = (params?.callType || callState.callType) === 'video';

  return (
    <View className="flex-1 bg-slate-950">
      {/* Remote Video / Fullscreen Status */}
      <View className="absolute inset-0 items-center justify-center">
        {remoteStreamURL && isVideo && !callState.remoteCameraOff ? (
          <RTCView 
             streamURL={remoteStreamURL} 
             style={{ width: '100%', height: '100%' }} 
             objectFit="cover" 
          />
        ) : (
        <View style={[styles.gradientBg, { backgroundColor: '#0f172a' }]}>
            <View style={{ alignItems: 'center' }}>
              <View className="w-36 h-36 bg-slate-800 rounded-full items-center justify-center mb-8 border-4 border-slate-700 shadow-2xl">
                <Text className="text-white text-5xl font-black">
                  {(params?.participantName || params?.groupName || callState.callerName || 'U').charAt(0)}
                </Text>
              </View>
              <Text className="text-white text-3xl font-black mb-3 tracking-tighter">
                {params?.participantName || params?.groupName || callState.callerName || 'Người dùng ZORA'}
              </Text>
              <View className="bg-white/10 px-4 py-1.5 rounded-full border border-white/10 flex-row items-center mb-10">
                <View className={`w-2 h-2 rounded-full mr-2 ${callState.callStatus === 'in_call' ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`} />
                <Text className="text-white/80 font-bold text-sm tracking-widest uppercase">
                  {callState.callStatus === 'in_call' ? formatDuration(duration) : 
                   isIncoming ? 'Đang gọi tới...' : 'Đang đổ chuông...'}
                </Text>
              </View>
              
              {isVideo && callState.remoteCameraOff && callState.callStatus === 'in_call' && (
                <Text className="text-white/40 font-medium text-base">Đối phương đã tắt camera</Text>
              )}
            </View>
        </View>
        )}
      </View>

      {/* Local Video (PiP) */}
      {localStream && isVideo && !isVideoOff && (
        <View className="absolute top-16 right-6 w-36 h-48 bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl">
          <RTCView 
            streamURL={(localStream as any).toURL()} 
            style={{ width: '100%', height: '100%' }} 
            objectFit="cover" 
            zOrder={1}
            mirror={facingMode === 'user'}
          />
          <TouchableOpacity 
            onPress={switchCamera}
            className="absolute bottom-2 right-2 w-10 h-10 bg-black/40 rounded-full items-center justify-center border border-white/20"
          >
            <RefreshCcw size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Controls Overlay */}
      <View className="absolute bottom-16 left-0 right-0 px-8">
        {isIncoming ? (
          <View className="flex-row justify-around">
            <View className="items-center">
              <TouchableOpacity onPress={handleReject} className="w-18 h-18 bg-red-500 rounded-full items-center justify-center shadow-xl shadow-red-500/40">
                <PhoneOff size={32} color="#fff" />
              </TouchableOpacity>
              <Text className="text-white/60 text-xs font-bold mt-3">TỪ CHỐI</Text>
            </View>
            <View className="items-center">
              <TouchableOpacity onPress={answerCall} className="w-18 h-18 bg-green-500 rounded-full items-center justify-center shadow-xl shadow-green-500/40">
                <Phone size={32} color="#fff" />
              </TouchableOpacity>
              <Text className="text-white/60 text-xs font-bold mt-3">TRẢ LỜI</Text>
            </View>
          </View>
        ) : (
          <View className="flex-row justify-between items-center bg-slate-900/80 p-5 rounded-[40px] border border-white/10 shadow-2xl">
            <TouchableOpacity onPress={toggleSpeakerphone} className={`w-14 h-14 rounded-3xl items-center justify-center ${!isSpeakerOn ? 'bg-white' : 'bg-slate-800'}`}>
              {isSpeakerOn ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#111" />}
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMute} className={`w-14 h-14 rounded-3xl items-center justify-center ${isMuted ? 'bg-white' : 'bg-slate-800'}`}>
              {isMuted ? <MicOff size={24} color="#111" /> : <Mic size={24} color="#fff" />}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleEndCall} className="w-18 h-18 bg-red-500 rounded-full items-center justify-center shadow-xl shadow-red-500/40">
              <PhoneOff size={32} color="#fff" />
            </TouchableOpacity>

            {isVideo ? (
              <TouchableOpacity onPress={toggleVideo} className={`w-14 h-14 rounded-3xl items-center justify-center ${isVideoOff ? 'bg-white' : 'bg-slate-800'}`}>
                {isVideoOff ? <VideoOff size={24} color="#111" /> : <VideoIcon size={24} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <View className="w-14 h-14 bg-slate-800 rounded-3xl items-center justify-center opacity-40">
                 <VideoOff size={24} color="#fff" />
              </View>
            )}

            <TouchableOpacity onPress={switchCamera} className="w-14 h-14 bg-slate-800 rounded-3xl items-center justify-center">
              <RefreshCcw size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
