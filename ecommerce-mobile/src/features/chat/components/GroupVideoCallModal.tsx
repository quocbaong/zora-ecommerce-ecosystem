import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Platform } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { PhoneOff, MicOff, Mic, VideoOff, Video as VideoIcon, Users, Maximize2, Minimize2, RefreshCcw, Volume2, VolumeX } from 'lucide-react-native';
import { useGroupCallStore } from '../../../store/groupCallStore';
import { useGroupCall } from '../hooks/useGroupCall';
import { COLORS } from '../../../constants';
import socketService from '../../../services/socket/socketService';

const { width, height } = Dimensions.get('window');

function ParticipantVideo({ participant, size }: { participant: any, size: number }) {
  const initial = (participant.name || '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.participantContainer, { width: size, height: size * 0.75 }]}>
      {participant.streamURL ? (
        <RTCView 
          streamURL={participant.streamURL} 
          style={styles.rtcView} 
          objectFit="cover" 
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.placeholderName}>{participant.name}</Text>
        </View>
      )}
      <View style={styles.nameBadge}>
        <Text style={styles.nameBadgeText} numberOfLines={1}>{participant.name}</Text>
      </View>
    </View>
  );
}

export default function GroupVideoCallModal({ navigation, route }: any) {
  const params = route?.params;
  const { status, participants, groupName, callType, endGroupCall } = useGroupCallStore();
  const { 
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
    toggleSpeakerphone
  } = useGroupCall();

  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasParticipants = Object.keys(participants).length > 0;
    let interval: ReturnType<typeof setInterval>;
    
    if (status === 'in_call' && hasParticipants) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, Object.keys(participants).length > 0]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (params?.groupId && params?.callId) {
      // Joining an existing call
      joinGroupCall(params.groupId, params.callId, params.callType || 'video', params.groupName || 'Nhóm');
    } else if (params?.groupId && !params?.callId) {
      // Initiating a new call
      initiateGroupCall(params.groupId, params.groupName || 'Nhóm', params.callType || 'video');
    }
  }, [params]);

  const hasBeenActive = useRef(false);
  const navigationRef_local = useRef(navigation);

  useEffect(() => {
    navigationRef_local.current = navigation;
  }, [navigation]);

  useEffect(() => {
    if (status !== 'idle') {
      hasBeenActive.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (status === 'idle' && hasBeenActive.current) {
      console.log('[GCALL] Call ended, navigating back...');
      hasBeenActive.current = false;
      const leftGroupId = params?.groupId;
      try {
        if (navigationRef_local.current?.reset) {
          navigationRef_local.current.reset({
            index: 1,
            routes: [
              { name: 'ConversationList' },
              { name: 'GroupChatScreen', params: { groupId: leftGroupId, groupName: params?.groupName || 'Nhóm' } }
            ]
          });
        } else if (navigationRef_local.current?.canGoBack()) {
          navigationRef_local.current.goBack();
        }
      } catch (e) {
        console.warn('[GCALL] Navigation error during goBack/replace', e);
      }
      // Re-query after GroupChatScreen mounts (800ms delay for screen to mount)
      if (leftGroupId) {
        setTimeout(() => {
          console.log('[GCALL] Re-querying active call after nav back for group:', leftGroupId);
          socketService.queryActiveGroupCall(leftGroupId);
        }, 800);
      }
    }
  }, [status]);

  const handleHangUp = () => {
    cleanupGroupCall();
    // The useEffect above will handle navigation back
  };

  const isAudioOnly = params?.callType === 'audio' || callType === 'audio';
  const partList = Object.values(participants);
  const totalItems = partList.length + 1; // +1 for local
  
  // Dynamic Grid logic
  let itemsPerRow = 2;
  let itemHeightRatio = 0.75;
  
  if (totalItems === 1) {
    itemsPerRow = 1;
    itemHeightRatio = 1.2; // Portait large
  } else if (totalItems === 2) {
    itemsPerRow = 1;
    itemHeightRatio = 0.6; // Two horizontal bars
  } else if (totalItems > 4) {
    itemsPerRow = 2;
    itemHeightRatio = 0.75;
  }
  
  const itemSize = (width - 48) / itemsPerRow;

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor: isAudioOnly ? '#1e293b' : '#0f172a' }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Users size={18} color={COLORS.primary} />
            <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 }}>
              {isAudioOnly ? '📞 Thoại nhóm' : '📹 Video nhóm'}
            </Text>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            <View style={styles.participantCount}>
              <Text style={styles.countText}>{totalItems} người</Text>
            </View>
          </View>
        </View>

        {/* Audio-only UI: Avatar grid */}
        {isAudioOnly ? (
          <ScrollView style={styles.gridContainer} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
              {/* Local user */}
              <View style={{ alignItems: 'center', width: 90 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: isMuted ? '#ef4444' : '#22c55e' }}>
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>B</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>Bạn {isMuted && '🔇'}</Text>
              </View>
              {/* Remote participants */}
              {partList.map(p => (
                <View key={p.userId} style={{ alignItems: 'center', width: 90 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#475569', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#22c55e' }}>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{(p.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
                </View>
              ))}
              {partList.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Users size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 16 }}>Đang chờ thành viên tham gia...</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          /* Video Grid */
          <ScrollView style={styles.gridContainer} contentContainerStyle={styles.gridContent}>
            <View style={styles.grid}>
              {/* Local Video */}
              <View style={[styles.participantContainer, { width: itemSize, height: itemSize * itemHeightRatio }]}>
                {localStream && !isVideoOff ? (
                  <RTCView 
                    streamURL={(localStream as any).toURL()} 
                    style={styles.rtcView} 
                    objectFit="cover" 
                    mirror={facingMode === 'user'}
                  />
                ) : (
                  <View style={[styles.placeholder, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                    <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.avatarText}>B</Text>
                    </View>
                    <Text style={styles.placeholderName}>Bạn</Text>
                  </View>
                )}
                <View style={styles.nameBadge}>
                  <Text style={styles.nameBadgeText}>Bạn {isMuted && '🔇'}</Text>
                </View>
                
                {localStream && !isVideoOff && (
                  <TouchableOpacity 
                    onPress={switchCamera}
                    style={styles.switchCamSmall}
                  >
                    <RefreshCcw size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Remote Participants */}
              {partList.map(p => (
                <ParticipantVideo key={p.userId} participant={p} size={itemSize} />
              ))}

              {partList.length === 0 && (
                <View style={[styles.waitingBox, { width: itemSize, height: itemSize * itemHeightRatio }]}>
                  <Users size={32} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.waitingText}>Đang chờ thành viên...</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Footer Controls */}
        <View style={styles.footer}>
          <TouchableOpacity 
             onPress={toggleSpeakerphone} 
             style={[styles.controlBtn, !isSpeakerOn && styles.controlBtnActive]}
          >
            {isSpeakerOn ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity 
             onPress={toggleMute} 
             style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          >
            {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleHangUp} style={styles.hangupBtn}>
            <PhoneOff size={32} color="#fff" />
          </TouchableOpacity>

          {!isAudioOnly && (
            <>
              <TouchableOpacity 
                 onPress={toggleCamera} 
                 style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
              >
                {isVideoOff ? <VideoOff size={24} color="#fff" /> : <VideoIcon size={24} color="#fff" />}
              </TouchableOpacity>

              <TouchableOpacity 
                 onPress={switchCamera} 
                 style={styles.controlBtn}
              >
                <RefreshCcw size={24} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  countText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  participantContainer: {
    backgroundColor: '#334155',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rtcView: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholderName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  nameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nameBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  waitingBox: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginBottom: 16,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  switchCamSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnActive: {
    backgroundColor: '#ef4444',
  },
  hangupBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }
});
