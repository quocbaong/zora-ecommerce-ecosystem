import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Phone, Video, PhoneOff, Users } from 'lucide-react-native';
import { useChatStore } from '../../../store/chatStore';
import { useGroupCallStore } from '../../../store/groupCallStore';
import socketService from '../../../services/socket/socketService';
import { COLORS } from '../../../constants';

const { width } = Dimensions.get('window');

async function requestCallPermissions(isVideo: boolean) {
  if (Platform.OS !== 'android') return true;
  try {
    const perms: import('react-native').Permission[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (isVideo) perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    const result = await PermissionsAndroid.requestMultiple(perms);
    return perms.every(p => result[p] === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
}

import * as NavigationService from '../../../navigation/navigationRef';

  export default function GlobalCallOverlay() {
  // Local "accepted" state to hide overlay immediately on press
  // (without changing the store state, so VideoCallModal can still call answerCall())
  const [accepted1to1, setAccepted1to1] = useState(false);
  const [acceptedGroup, setAcceptedGroup] = useState(false);
  
  // ... (rest of the component state)
  const callStatus = useChatStore(state => state.call.callStatus);
  const callType = useChatStore(state => state.call.callType);
  const callerName = useChatStore(state => state.call.callerName);
  const conversationId = useChatStore(state => state.call.conversationId);
  const callId = useChatStore(state => state.call.callId);
  const endCall = useChatStore(state => state.endCall);

  const groupStatus = useGroupCallStore(state => state.status);
  const groupName = useGroupCallStore(state => state.groupName);
  const groupCallerName = useGroupCallStore(state => state.callerName);
  const groupId = useGroupCallStore(state => state.groupId);
  const groupCallId = useGroupCallStore(state => state.callId);
  const groupCallType = useGroupCallStore(state => state.callType);
  const endGroupCall = useGroupCallStore(state => state.endGroupCall);

  const navLock = useRef(false);

  // Reset accepted state when call ends
  useEffect(() => {
    if (callStatus !== 'incoming') {
      setAccepted1to1(false);
      navLock.current = false;
    }
  }, [callStatus]);

  useEffect(() => {
    if (groupStatus !== 'ringing') {
      setAcceptedGroup(false);
      navLock.current = false;
    }
  }, [groupStatus]);

  // Listen for group_call_ended directly here (caller cancels before anyone joins)
  // This is needed because useGroupCall hook is only active in GroupVideoCallModal
  useEffect(() => {
    if (groupStatus !== 'ringing') return;

    const handleCallEnded = (data: any) => {
      if (data?.callId === groupCallId || data?.groupId === groupId) {
        console.log('[GCALL] Caller cancelled → dismissing overlay');
        endGroupCall();
      }
    };

    const handleCallEndedMessage = ({ message, groupId: msgGroupId }: any) => {
      if (msgGroupId !== groupId) return;
      if (message?.type === 'CALL' || message?.type === 'GROUP_CALL') {
        try {
          const d = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
          if ((d?.status === 'missed' || d?.status === 'ended') && groupStatus === 'ringing') {
            console.log('[GCALL] CALL message (missed/ended) → dismissing overlay');
            endGroupCall();
          }
        } catch {}
      }
    };

    socketService.socket?.on('group_call_ended', handleCallEnded);
    socketService.socket?.on('new_group_message', handleCallEndedMessage);

    return () => {
      socketService.socket?.off('group_call_ended', handleCallEnded);
      socketService.socket?.off('new_group_message', handleCallEndedMessage);
    };
  }, [groupStatus, groupCallId, groupId, endGroupCall]);

  const isIncoming1to1 = callStatus === 'incoming' && !accepted1to1;
  const isIncomingGroup = groupStatus === 'ringing' && !acceptedGroup;

  if (!isIncoming1to1 && !isIncomingGroup) return null;
  if (callStatus === 'in_call' || groupStatus === 'in_call') return null;

  const handleReject1to1 = () => {
    if (conversationId && callId) {
      socketService.socket?.emit('call_reject', { conversationId, callId });
    }
    endCall();
  };

  const handleAccept1to1 = async () => {
    if (navLock.current) return;
    const isVideo = callType === 'video';
    const ok = await requestCallPermissions(isVideo);
    if (!ok) return;
    
    console.log('[CALL] Accept button pressed, locking navigation and transitioning...');
    navLock.current = true;
    setAccepted1to1(true);
    
    NavigationService.navigate('ChatTab', {
      screen: 'VideoCallModal',
      params: { conversationId, participantName: callerName, callType, autoAnswer: true },
    });
  };

  const handleRejectGroup = () => {
    const rejectedGroupId = groupId; // capture before endGroupCall clears it
    endGroupCall();
    // After rejecting, immediately query whether the call is still active
    // so the "Tham gia" button can appear in the group chat screen
    if (rejectedGroupId) {
      setTimeout(() => socketService.queryActiveGroupCall(rejectedGroupId), 200);
    }
  };

  const handleAcceptGroup = async () => {
    if (navLock.current) return;
    const isVideo = groupCallType === 'video';
    const ok = await requestCallPermissions(isVideo);
    if (!ok) return;
    
    console.log('[GCALL] Join button pressed, locking navigation and transitioning...');
    navLock.current = true;
    setAcceptedGroup(true);
    
    NavigationService.navigate('ChatTab', {
      screen: 'GroupVideoCallModal',
      params: { groupId, callId: groupCallId, callType: groupCallType, groupName },
    });
  };

  // ── Render ───────────────────────────────────────────────────────
  if (isIncoming1to1) {
    return (
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.avatarText}>
                {(callerName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.pulse} />
          </View>

          {/* Call type icon badge */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: callType === 'video' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 6,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: callType === 'video' ? 'rgba(249,115,22,0.3)' : 'rgba(34,197,94,0.3)',
          }}>
            {callType === 'video'
              ? <Video size={16} color="#f97316" />
              : <Phone size={16} color="#22c55e" />
            }
            <Text style={{ color: callType === 'video' ? '#f97316' : '#22c55e', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
              {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
            </Text>
          </View>
          <Text style={styles.callerName}>{callerName || 'Người dùng'}</Text>
          <Text style={styles.subText}>đang gọi cho bạn...</Text>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <View style={styles.btnGroup}>
              <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleReject1to1}>
                <PhoneOff size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Từ chối</Text>
            </View>
            <View style={styles.btnGroup}>
              <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept1to1}>
                {callType === 'video' ? <Video size={32} color="#fff" /> : <Phone size={32} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Nghe máy</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Group call
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: '#f59e0b' }]}>
            <Users size={48} color="#fff" />
          </View>
          <View style={[styles.pulse, { borderColor: '#f59e0b' }]} />
        </View>

        {/* Call type icon badge - Group */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: groupCallType === 'video' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 6,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: groupCallType === 'video' ? 'rgba(249,115,22,0.3)' : 'rgba(34,197,94,0.3)',
        }}>
          {groupCallType === 'video'
            ? <Video size={16} color="#f97316" />
            : <Phone size={16} color="#22c55e" />
          }
          <Text style={{ color: groupCallType === 'video' ? '#f97316' : '#22c55e', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
            {groupCallType === 'video' ? 'Gọi video nhóm' : 'Gọi thoại nhóm'}
          </Text>
        </View>
        <Text style={styles.callerName}>{groupName || 'Nhóm'}</Text>
        <Text style={styles.subText}>{groupCallerName} đang mời bạn tham gia...</Text>

        <View style={styles.btnRow}>
          <View style={styles.btnGroup}>
            <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleRejectGroup}>
              <PhoneOff size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Từ chối</Text>
          </View>
          <View style={styles.btnGroup}>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAcceptGroup}>
              {groupCallType === 'video' ? <Video size={32} color="#fff" /> : <Phone size={32} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.btnLabel}>Tham gia</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: width * 0.88,
    backgroundColor: '#0f172a',
    borderRadius: 32,
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  avatarWrap: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 0.35,
    zIndex: 1,
  },
  avatarText: {
    fontSize: 52,
    color: '#fff',
    fontWeight: 'bold',
  },
  callTypeLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  callerName: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 40,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  btnGroup: {
    alignItems: 'center',
  },
  btn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
  btnLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
  },
});
