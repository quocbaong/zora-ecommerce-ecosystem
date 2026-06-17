import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { saveMessage, recallLocalMessage } from '../sqlite/database';
import { useChatStore } from '../../store/chatStore';
import { useGroupStore } from '../../store/groupStore';
import { useGroupCallStore } from '../../store/groupCallStore';
import apiClient from '../../api/client';

class SocketService {
  public socket: Socket | null = null;
  private userId: string | null = null;
  private listenersRegistered = false;

  private messageListeners: Function[] = [];
  private recallListeners: Function[] = [];
  private reactionListeners: Function[] = [];
  private isConnecting: boolean = false;

  async fetchAndJoinGroups() {
    try {
      const groupRes = await apiClient.get('/chat/groups');
      const groups = groupRes.data?.data || groupRes.data || [];
      groups.forEach((g: any) => {
        const groupId = g.groupId || g.id;
        if (groupId && this.socket) {
          console.log(`[SOCKET] Auto-joining group room globally: ${groupId}`);
          this.socket.emit('join_group', { groupId });
        }
      });
    } catch (err) {
      console.warn('[SOCKET] Cannot fetch groups for global socket join', err);
    }
  }

  async connect() {
    if (this.isConnecting) {
      console.log('Socket already connecting, please wait...');
      return;
    }
    
    const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.warn('EXPO_PUBLIC_SOCKET_URL is not defined');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.isConnecting = true;

    // Clean up any existing stale socket
    if (this.socket) {
      console.log('Cleaning up stale socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listenersRegistered = false;
    }

    try {
      const token = await SecureStore.getItemAsync('access_token');
      console.log('Connecting to socket with token exists:', !!token);

      this.socket = io(socketUrl!, {
        transports: ['websocket'],
        autoConnect: true,
        auth: { token }
      });

      this.setupListeners();
    } catch (e) {
      console.error('Socket connect error:', e);
    } finally {
      this.isConnecting = false;
    }
  }

  private setupListeners() {
    if (!this.socket || this.listenersRegistered) return;
    this.listenersRegistered = true;

    console.log('Registering socket event listeners...');

    this.socket.on('connect', async () => {
      this.userId = await SecureStore.getItemAsync('user_id');
      console.log('Socket connected, UID:', this.userId);

      // Proactively fetch all groups and join their socket rooms to receive global group notifications (like incoming calls)
      this.fetchAndJoinGroups();
    });

    // ─── 1-1 Chat Events ───────────────────────────────────────────
    this.socket.on('new_message', async (payload) => {
      const { message } = payload;
      if (message.messageId && !message.id) message.id = message.messageId;
      
      console.log('[SOCKET] new_message:', message.id);
      
      // Update store
      useChatStore.getState().addMessage(message.conversationId, message);
      this.messageListeners.forEach(cb => cb(payload));
    });

    this.socket.on('message_recalled', async (payload) => {
      const { messageId, conversationId } = payload;
      recallLocalMessage(messageId).catch(console.error);
      useChatStore.getState().recallMessage(conversationId, messageId);
      this.recallListeners.forEach(cb => cb(payload));
    });

    this.socket.on('reaction_updated', (payload) => {
      const { conversationId, messageId, reactions } = payload;
      useChatStore.getState().updateReactions(conversationId, messageId, reactions);
      this.reactionListeners.forEach(cb => cb(payload));
    });

    this.socket.on('user_typing', ({ conversationId, senderId }) => {
       console.log('[SOCKET] user_typing event from:', senderId, 'in conv:', conversationId);
       useChatStore.getState().setTyping(senderId, true);
       setTimeout(() => useChatStore.getState().setTyping(senderId, false), 3000);
    });

    this.socket.on('message_read', ({ conversationId, userId }) => {
      useChatStore.getState().setRead(conversationId, userId);
    });

    // ─── Group Chat Events ──────────────────────────────────────────
    this.socket.on('new_group_message', ({ message, groupId, poll }) => {
      if (message.messageId && !message.id) {
        message.id = message.messageId;
      }
      console.log('[SOCKET] new_group_message RECEIVED:', message.id, 'in group:', groupId, 'type:', message.type);

      // When a GROUP_CALL/CALL message arrives (call ended notification), clear the Join button
      if (message.type === 'GROUP_CALL' || message.type === 'CALL') {
        try {
          const callData = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
          if (callData?.status === 'ended' || callData?.status === 'missed') {
            console.log('[GCALL] Call ended message (type:', message.type, ') → clearing Join button for group:', groupId);
            useGroupCallStore.getState().setActiveCallInfo(groupId, null);
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      // Remove any optimistic (temp_) message from the same sender before adding real one
      const store = useGroupStore.getState();
      const existing = store.groupMessages[groupId] ?? [];
      const tempMsg = existing.find(
        (m) => m.messageId?.startsWith('temp_') && m.senderId === message.senderId && m.type === message.type
      );
      if (tempMsg) {
        store.deleteGroupMessage(groupId, tempMsg.messageId);
      }

      store.addGroupMessage(groupId, message);
      if (poll) {
        store.upsertPoll(groupId, poll);
      }
    });

    this.socket.on('poll_updated', ({ groupId, pollId, options, closed }) => {
      useGroupStore.getState().updatePollOptions(groupId, pollId, options, closed);
    });

    this.socket.on('group_message_recalled', ({ messageId, groupId }) => {
      useGroupStore.getState().recallGroupMessage(groupId, messageId);
    });

    this.socket.on('group_message_read', ({ groupId, userId }) => {
      useGroupStore.getState().setGroupRead(groupId, userId);
    });

    this.socket.on('group_reaction', ({ messageId, groupId, reactions }) => {
      useGroupStore.getState().updateGroupReactions(groupId, messageId, reactions);
    });

    this.socket.on('group_typing', ({ groupId, userId }) => {
      console.log('[SOCKET] group_typing event from:', userId, 'in group:', groupId);
      useGroupStore.getState().setGroupTyping(groupId, userId, true);
      
      // Auto-clear after 3s since backend usually only sends start pulse
      const typingKey = `typing_${groupId}_${userId}`;
      if ((this as any)[typingKey]) clearTimeout((this as any)[typingKey]);
      (this as any)[typingKey] = setTimeout(() => {
        useGroupStore.getState().setGroupTyping(groupId, userId, false);
        delete (this as any)[typingKey];
      }, 3000);
    });

    this.socket.on('group_message_read', ({ groupId, userId }) => {
      useGroupStore.getState().setGroupRead(groupId, userId);
    });

    this.socket.on('group_member_added', ({ groupId, member, userIds }) => {
      const existing = useGroupStore.getState().groupMembers[groupId] || [];
      let newMembers = [...existing];
      
      if (member && member.userId) {
        newMembers.push(member);
      }
      if (userIds && Array.isArray(userIds)) {
        userIds.forEach((uid: string) => {
          if (!newMembers.find(m => m.userId === uid)) {
            newMembers.push({ 
              userId: uid, 
              role: 'MEMBER',
              groupId: groupId,
              joinedAt: new Date().toISOString(),
              user: { id: uid, fullName: 'Người dùng mới' }
            } as any);
          }
        });
      }
      
      useGroupStore.getState().setGroupMembers(groupId, newMembers);
    });

    this.socket.on('group_member_removed', ({ groupId, userId }) => {
      useGroupStore.getState().removeMember(groupId, userId);
    });

    this.socket.on('group_member_updated', ({ groupId, userId, role }) => {
      useGroupStore.getState().updateMemberRole(groupId, userId, role);
    });

    this.socket.on('user_status_changed', ({ userId, status }) => {
       useChatStore.getState().updateUserStatus?.(userId, status);
    });

    this.socket.on('new_notification', (notification) => {
       console.log('[SOCKET] new_notification received:', notification);
       // Dynamically import to avoid circular dependency
       const { useNotificationStore } = require('../../store/notificationStore');
       useNotificationStore.getState().receiveNotification(notification);
    });

    // ─── WebRTC Call Events ─────────────────────────────────────────
    this.socket.on('incoming_call', (data) => {
      const callState = useChatStore.getState().call;
      // IGNORE if already in a call or already showing this incoming call
      if (callState.callStatus !== 'idle' && callState.callId !== data.callId) {
        console.log('[CALL] Busy, ignoring incoming call:', data.callId, 'currentStatus:', callState.callStatus);
        return;
      }
      
      console.log('[CALL] Incoming Event:', { callId: data.callId, from: data.callerName, type: data.callType });
      useChatStore.getState().receiveCall(
        data.conversationId,
        data.callId,
        data.callType,
        data.callerId,
        data.callerName,
        data.offer
      );
    });

    this.socket.on('call_answered', (data) => {
      console.log('[CALL] Answered Event:', { callId: data.callId, hasAnswer: !!data.answer });
      if (data.answer) {
        useChatStore.getState().acceptCall(data.answer);
      }
    });

    this.socket.on('call_rejected', (data) => {
      console.log('[CALL] Rejected Event:', data?.callId);
      useChatStore.getState().endCall();
    });

    this.socket.on('call_ended', () => {
      useChatStore.getState().endCall();
    });

    this.socket.on('group_incoming_call', (data) => {
      console.log('[GCALL] Incoming group call', data.callId);
      useGroupCallStore.getState().receiveGroupCall(
        data.groupId,
        data.groupName || 'Nhóm',
        data.callId,
        data.callType,
        data.callerId,
        data.callerName
      );
      // Also track this as an active call immediately so the "Join" button
      // can appear even if user rejects and comes back to the chat screen.
      useGroupCallStore.getState().setActiveCallInfo(data.groupId, {
        groupId: data.groupId,
        callId: data.callId,
        callType: data.callType,
        startedAt: new Date(),
        callerId: data.callerId || '',
      });
    });

    this.socket.on('group_active_call_status', (data) => {
      console.log('[GCALL] Received active call status from server:', data);
      if (data.active && data.callId && data.callType) {
        useGroupCallStore.getState().setActiveCallInfo(data.groupId, {
          groupId: data.groupId,
          callId: data.callId,
          callType: data.callType,
          startedAt: new Date(),
          callerId: data.callerName || '',
        });
      } else {
        useGroupCallStore.getState().setActiveCallInfo(data.groupId, null);
      }
    });

    this.socket.on('group_call_ended', (data) => {
      console.log('[GCALL] Global listener received group_call_ended -> ending group call.');
      useGroupCallStore.getState().endGroupCall();
      // Clear AFTER endGroupCall so its "preserve" state doesn't undo this
      if (data?.groupId) {
        useGroupCallStore.getState().setActiveCallInfo(data.groupId, null);
      }
    });
    
    this.socket.on('group_message_pinned', ({ groupId, message, pin }) => {
      useGroupStore.getState().addPin(groupId, pin || message);
    });

    this.socket.on('group_message_unpinned', ({ groupId, messageId }) => {
      useGroupStore.getState().removePin(groupId, messageId);
    });



    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  // Listener Registration
  onMessage(cb: Function) { this.messageListeners.push(cb); }
  offMessage(cb: Function) { this.messageListeners = this.messageListeners.filter(l => l !== cb); }
  
  onRecall(cb: Function) { this.recallListeners.push(cb); }
  offRecall(cb: Function) { this.recallListeners = this.recallListeners.filter(l => l !== cb); }
  
  onReaction(cb: Function) { this.reactionListeners.push(cb); }
  offReaction(cb: Function) { this.reactionListeners = this.reactionListeners.filter(l => l !== cb); }

  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  joinGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('join_group', { groupId });
    }
  }

  sendMessage(conversationId: string, content: string, type: string = 'TEXT', replyMessage?: any) {
    if (this.socket) {
      this.socket.emit('send_message', { conversationId, content, type, replyMessage });
    }
  }

  sendGroupMessage(groupId: string, content: string, type: string = 'TEXT') {
    if (this.socket) {
      this.socket.emit('send_group_message', { groupId, content, type });
    }
  }

  emitTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing', { conversationId });
    }
  }

  emitGroupTyping(groupId: string) {
    if (this.socket) {
      this.socket.emit('group_typing', { groupId });
    }
  }

  markAsRead(conversationId: string) {
    if (this.socket) {
      this.socket.emit('mark_read', { conversationId });
    }
  }

  markGroupAsRead(groupId: string) {
    if (this.socket) {
      this.socket.emit('group_mark_read', { groupId });
    }
  }

  queryActiveGroupCall(groupId: string) {
    console.log('[GCALL] queryActiveGroupCall called, groupId:', groupId, 'socket connected:', this.socket?.connected);
    if (this.socket) {
      // Register a one-time response handler BEFORE emitting so we never miss the response
      this.socket.once('group_active_call_status', (data: any) => {
        if (data?.groupId !== groupId) return;
        console.log('[GCALL] queryActiveGroupCall response:', data.groupId, 'active:', data.active);
        if (data.active && data.callId && data.callType) {
          useGroupCallStore.getState().setActiveCallInfo(data.groupId, {
            groupId: data.groupId,
            callId: data.callId,
            callType: data.callType,
            startedAt: new Date(),
            callerId: data.callerName || '',
          });
        } else {
          useGroupCallStore.getState().setActiveCallInfo(data.groupId, null);
        }
      });
      this.socket.emit('group_query_active_call', { groupId });
    } else {
      console.warn('[GCALL] queryActiveGroupCall: socket is null!');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageListeners = [];
    this.recallListeners = [];
    this.reactionListeners = [];
  }
}

export default new SocketService();
