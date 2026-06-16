const chatService = require('../services/chatService');
const messageModel = require('../models/messageModel');
const conversationModel = require('../models/conversationModel');
const groupMemberModel = require('../models/groupMemberModel');
const groupMessageService = require('../services/groupMessageService');
const groupModel = require('../models/groupModel');

// Track active 1-1 calls: callId → { conversationId, callType, callerId, callerRole, startedAt }
const activeCalls = new Map();

// Track active group calls: callId → { groupId, callType, callerId, callerName, participants: Set }
const activeGroupCalls = new Map();

// Presence: userId -> number of active sockets/tabs
const onlineUserCounts = new Map();

const registerChatHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    // Join personal notification room so user receives notifications from any conversation
    socket.join(`user:${socket.userId}`);

    // Auto-join all group rooms so new_group_message reaches user on any page
    groupModel.listGroupsByUser(socket.userId)
      .then((groups) => {
        groups.forEach((g) => socket.join(`group:${g.groupId}`));
      })
      .catch(() => {}); // non-fatal

    const currentConnectionCount = onlineUserCounts.get(socket.userId) || 0;
    onlineUserCounts.set(socket.userId, currentConnectionCount + 1);
    if (currentConnectionCount === 0) {
      io.emit('presence_update', { userId: socket.userId, isOnline: true });
    }

    socket.on('presence_query', ({ userIds = [] } = {}) => {
      const presence = {};
      userIds
        .filter((userId) => typeof userId === 'string' && userId.trim())
        .forEach((userId) => {
          presence[userId] = (onlineUserCounts.get(userId) || 0) > 0;
        });
      socket.emit('presence_snapshot', { presence });
    });

    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(conversationId);
      console.log(`${socket.userId} joined room ${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, type, content }) => {
      try {
        const reportService = require('../services/reportService');
        const userMeta = await reportService.getUserMetadata(socket.userId);
        if (userMeta && userMeta.mutedUntil && new Date(userMeta.mutedUntil) > new Date()) {
            throw new Error("Bạn đã bị cấm chat đến " + new Date(userMeta.mutedUntil).toLocaleString());
        }
        const { message, conversation } = await chatService.sendMessage({
          conversationId,
          senderId: socket.userId,
          senderRole: socket.userRole,
          type: type || 'TEXT',
          content,
        });

        const recipientId =
          socket.userId === conversation.userId ? conversation.sellerId : conversation.userId;

        // Ensure conversationId is in payload so the frontend can route the message correctly
        const payload = { message: { ...message, conversationId } };

        // Broadcast to conversation room (users who have opened this chat)
        io.to(conversationId).emit('new_message', payload);

        // Also push to each participant's personal room for global real-time delivery
        io.to(`user:${socket.userId}`).emit('new_message', payload);
        io.to(`user:${recipientId}`).emit('new_message', payload);

        io.to(`user:${recipientId}`).emit('new_notification', {
          conversationId,
          fromUserId: socket.userId,
          fromRole: socket.userRole,
          preview: typeof content === 'string' ? content.substring(0, 50) : '',
          type: type || 'TEXT',
          timestamp: message.createdAt,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', {
        senderId: socket.userId,
        senderRole: socket.userRole,
      });
    });

    socket.on('mark_read', async ({ conversationId }) => {
      try {
        await chatService.markAsRead(conversationId, socket.userId, socket.userRole);
        socket.to(conversationId).emit('message_read', {
          conversationId,
          userId: socket.userId,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Group read receipt
    socket.on('group_mark_read', async ({ groupId }) => {
      try {
        await groupMessageService.markAsRead(groupId, socket.userId);
        // Broadcast to all group members so they can update "Đã xem" indicators
        socket.to(`group:${groupId}`).emit('group_message_read', {
          groupId,
          userId: socket.userId,
        });
      } catch (err) {
        // silent — not critical
      }
    });

    socket.on('recall_message', async ({ conversationId, messageId }) => {
      try {
        const result = await chatService.recallMessage(conversationId, messageId, socket.userId);
        if (result) {
          io.to(conversationId).emit('message_recalled', { conversationId, messageId });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('add_reaction', async ({ conversationId, messageId, emoji }) => {
      try {
        const result = await chatService.addReaction(conversationId, messageId, emoji, socket.userId);
        if (result) {
          io.to(conversationId).emit('reaction_updated', {
            conversationId,
            messageId,
            reactions: result.reactions,
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Video Call Signaling ─────────────────────────────────────────────────

    socket.on('call_initiate', async ({ conversationId, callId, callType, callerName, offer }) => {
      try {
        // Store active call metadata for duration tracking
        activeCalls.set(callId, {
          conversationId,
          callType: callType || 'video',
          callerId: socket.userId,
          callerRole: socket.userRole,
          callerName: callerName || socket.userId,
          startedAt: null, // set when answered
        });

        // Build payload — MUST include offer so callee can answer
        const payload = {
          conversationId,
          callId,
          callType: callType || 'video',
          callerId: socket.userId,
          callerRole: socket.userRole,
          callerName: callerName || socket.userId,
          offer, // ← SDP offer for WebRTC negotiation
        };

        // 1. Emit to conversation room (for users already on /chat)
        socket.to(conversationId).emit('incoming_call', payload);

        // 2. Also emit to recipient's personal room (for users NOT on /chat page)
        //    Look up conversation to find recipient userId
        const conversation = await conversationModel.getConversationById(conversationId);
        if (conversation) {
          const recipientId = socket.userId === conversation.userId
            ? conversation.sellerId
            : conversation.userId;
          if (recipientId) {
            io.to(`user:${recipientId}`).emit('incoming_call', payload);
          }
        }

        console.log(`[CALL] ${socket.userId} initiated call ${callId} (${callType}) in ${conversationId}`);
      } catch (err) {
        console.error('[CALL] call_initiate error:', err.message);
      }
    });

    socket.on('call_answer', ({ conversationId, callId, answer }) => {
      // Mark call as started (for duration tracking)
      if (activeCalls.has(callId)) {
        activeCalls.get(callId).startedAt = Date.now();
      }

      socket.to(conversationId).emit('call_answered', {
        conversationId,
        callId,
        answer,
        answererId: socket.userId,
      });
      console.log(`[CALL] ${socket.userId} answered call ${callId}`);
    });

    socket.on('call_reject', async ({ conversationId, callId }) => {
      try {
        const meta = activeCalls.get(callId);
        activeCalls.delete(callId);

        const rejectPayload = {
          conversationId,
          callId,
          rejecterId: socket.userId,
        };

        // Notify the caller — emit cả conversation room và personal room
        // (caller có thể không ở /chat khi recipient bấm từ chối)
        socket.to(conversationId).emit('call_rejected', rejectPayload);
        if (meta?.callerId && meta.callerId !== socket.userId) {
          io.to(`user:${meta.callerId}`).emit('call_rejected', rejectPayload);
        }

        // Save "missed call" message so both parties see it in history
        const callType = meta?.callType || 'video';
        const callContent = JSON.stringify({
          callId,
          callType,
          status: 'missed', // caller side sees it as missed
          duration: 0,
        });

        // Save as the caller's message (system perspective: caller initiated)
        const senderId = meta?.callerId || socket.userId;
        const senderRole = meta?.callerRole || socket.userRole;

        const { message } = await chatService.sendMessage({
          conversationId,
          senderId,
          senderRole,
          type: 'CALL',
          content: callContent,
        });

        io.to(conversationId).emit('new_message', { message });
        console.log(`[CALL] ${socket.userId} rejected call ${callId}`);
      } catch (err) {
        console.error('[CALL] call_reject error:', err.message);
      }
    });

    socket.on('call_end', async ({ conversationId, callId, duration }) => {
      try {
        const meta = activeCalls.get(callId);
        activeCalls.delete(callId);

        const endedPayload = {
          conversationId,
          callId,
          endedById: socket.userId,
        };

        // Emit to conversation room (cho user đang ở /chat)
        socket.to(conversationId).emit('call_ended', endedPayload);

        // Emit thêm vào personal room của bên kia (cho user không ở /chat,
        // họ chỉ join user:${id}, không join conversationId)
        try {
          const conversation = await conversationModel.getConversationById(conversationId);
          if (conversation) {
            [conversation.userId, conversation.sellerId, meta?.callerId]
              .filter((uid) => uid && uid !== socket.userId)
              .forEach((uid) => io.to(`user:${uid}`).emit('call_ended', endedPayload));
          }
        } catch (lookupErr) {
          console.error('[CALL] call_end recipient lookup failed:', lookupErr.message);
        }

        // Calculate actual duration
        let callDuration = duration || 0;
        if (meta?.startedAt && !duration) {
          callDuration = Math.floor((Date.now() - meta.startedAt) / 1000);
        }

        const callType = meta?.callType || 'video';
        const status = callDuration > 0 ? 'ended' : 'missed';

        const callContent = JSON.stringify({
          callId,
          callType,
          status,
          duration: callDuration,
        });

        const senderId = meta?.callerId || socket.userId;
        const senderRole = meta?.callerRole || socket.userRole;

        const { message } = await chatService.sendMessage({
          conversationId,
          senderId,
          senderRole,
          type: 'CALL',
          content: callContent,
        });

        io.to(conversationId).emit('new_message', { message });
        console.log(`[CALL] call ${callId} ended, duration=${callDuration}s`);
      } catch (err) {
        console.error('[CALL] call_end error:', err.message);
      }
    });

    // WebRTC signaling: relay SDP offer/answer and ICE candidates
    socket.on('webrtc_signal', ({ conversationId, callId, signal }) => {
      socket.to(conversationId).emit('webrtc_signal', {
        conversationId,
        callId,
        signal,
        fromUserId: socket.userId,
      });
    });

    // ── Group chat socket events ─────────────────────────────────────────────

    socket.on('join_group', ({ groupId }) => {
      socket.join(`group:${groupId}`);
      console.log(`${socket.userId} joined group room group:${groupId}`);
    });

    socket.on('leave_group', ({ groupId }) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('group_typing', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group_typing', {
        groupId,
        userId: socket.userId,
      });
    });

    // ── Group Call Signaling ─────────────────────────────────────────────────

    // Track active group calls: callId → { groupId, callType, callerId, callerName, participants: Set }
    // (module-level map declared below)

    socket.on('group_call_initiate', async ({ groupId, callId, callType, callerName }) => {
      try {
        // Fetch group name so we can use it in notifications
        const group = await groupModel.getGroupById(groupId).catch(() => null);
        const groupName = group?.name || groupId;

        if (!activeGroupCalls.has(callId)) {
          activeGroupCalls.set(callId, {
            groupId,
            groupName,
            callType: callType || 'video',
            callerId: socket.userId,
            callerName: callerName || socket.userId,
            startedAt: null,   // set when first other member joins
            // Map<userId, userName> so we can send real names to late joiners
            participants: new Map([[socket.userId, callerName || socket.userId]]),
          });
        }

        // Add caller to group call room
        socket.join(`gcall:${callId}`);

        const payload = {
          groupId,
          groupName,
          callId,
          callType: callType || 'video',
          callerId: socket.userId,
          callerName: callerName || socket.userId,
        };

        // Notify members currently viewing this group
        socket.to(`group:${groupId}`).emit('group_incoming_call', payload);

        // Also notify every other member via their personal room so they can
        // receive the ringing UI even when they haven't opened this group yet.
        const members = await groupMemberModel.listMembers(groupId).catch(() => []);
        members
          .filter((member) => member.userId && member.userId !== socket.userId)
          .forEach((member) => {
            io.to(`user:${member.userId}`).emit('group_incoming_call', payload);
          });

        console.log(`[GCALL] ${socket.userId} initiated group call ${callId} in group ${groupId} (${groupName})`);
      } catch (err) {
        console.error('[GCALL] group_call_initiate error:', err.message);
      }
    });

    socket.on('group_call_join', ({ groupId, callId, userName }) => {
      try {
        const meta = activeGroupCalls.get(callId);
        if (!meta) return;

        socket.join(`gcall:${callId}`);
        const resolvedName = userName || socket.userId;
        // Store real name in the Map so late joiners get correct names
        meta.participants.set(socket.userId, resolvedName);

        // Mark startedAt when at least 2 people are in the call
        if (!meta.startedAt && meta.participants.size >= 2) {
          meta.startedAt = Date.now();
        }

        // Build list of existing participants with REAL names (everyone except the joiner)
        const existingParticipants = [];
        meta.participants.forEach((uName, uid) => {
          if (uid !== socket.userId) {
            existingParticipants.push({ userId: uid, userName: uName });
          }
        });

        // Notify everyone else that this user joined
        socket.to(`gcall:${callId}`).emit('group_call_participant_joined', {
          groupId,
          callId,
          userId: socket.userId,
          userName: resolvedName,
        });

        // Tell the joiner about existing participants so they can create peer connections
        socket.emit('group_call_participant_joined', {
          groupId,
          callId,
          userId: socket.userId,
          userName: resolvedName,
          existingParticipants,
        });

        console.log(`[GCALL] ${socket.userId} joined group call ${callId}`);
      } catch (err) {
        console.error('[GCALL] group_call_join error:', err.message);
      }
    });

    socket.on('group_call_leave', async ({ groupId, callId }) => {
      try {
        const meta = activeGroupCalls.get(callId);
        if (meta) {
          meta.participants.delete(socket.userId); // Map.delete works same as Set.delete

          // If no participants left, end the call and save a CALL message
          if (meta.participants.size === 0) {
            activeGroupCalls.delete(callId);

            const duration = meta.startedAt
              ? Math.floor((Date.now() - meta.startedAt) / 1000)
              : 0;
            const status = duration > 0 ? 'ended' : 'missed';

            const callContent = JSON.stringify({
              callId,
              callType: meta.callType,
              status,
              duration,
              groupName: meta.groupName,
            });

            try {
              const message = await groupMessageService.sendSystemGroupMessage({
                groupId: meta.groupId,
                senderId: meta.callerId,
                type: 'CALL',
                content: callContent,
              });
              io.to(`group:${meta.groupId}`).emit('new_group_message', { groupId: meta.groupId, message });
            } catch (saveErr) {
              console.error('[GCALL] failed to save call message:', saveErr.message);
            }

            // Notify all group members (including non-participants) that the call has ended
            io.to(`group:${meta.groupId}`).emit('group_call_ended', { groupId: meta.groupId, callId });

            // Also notify via personal rooms so users who haven't opened the group can dismiss the ringing
            const members = await groupMemberModel.listMembers(meta.groupId).catch(() => []);
            members
              .filter((member) => member.userId && member.userId !== socket.userId)
              .forEach((member) => {
                io.to(`user:${member.userId}`).emit('group_call_ended', { groupId: meta.groupId, callId });
              });
          }
        }

        socket.leave(`gcall:${callId}`);
        socket.to(`gcall:${callId}`).emit('group_call_participant_left', {
          groupId,
          callId,
          userId: socket.userId,
        });

        console.log(`[GCALL] ${socket.userId} left group call ${callId}`);
      } catch (err) {
        console.error('[GCALL] group_call_leave error:', err.message);
      }
    });

    // Query whether a group currently has an active call (for late joiners)
    socket.on('group_query_active_call', ({ groupId }) => {
      for (const [callId, meta] of activeGroupCalls.entries()) {
        if (meta.groupId === groupId) {
          socket.emit('group_active_call_status', {
            groupId,
            callId,
            callType: meta.callType,
            callerName: meta.callerName,
            participantCount: meta.participants.size,
            active: true,
          });
          return;
        }
      }
      socket.emit('group_active_call_status', { groupId, active: false });
    });

    socket.on('group_call_reject', ({ groupId, callId }) => {
      // Just ignore — group calls don't have a "reject all" flow
      // The call continues for others; this user simply doesn't join
      console.log(`[GCALL] ${socket.userId} rejected group call ${callId}`);
    });

    // WebRTC signaling between two specific participants in a group call
    socket.on('group_webrtc_signal', ({ groupId, callId, targetUserId, signal }) => {
      // Forward signal only to the target user's personal room
      io.to(`user:${targetUserId}`).emit('group_webrtc_signal', {
        groupId,
        callId,
        fromUserId: socket.userId,
        signal,
      });
    });

    socket.on('disconnect', async () => {
      const currentCount = onlineUserCounts.get(socket.userId) || 0;
      if (currentCount <= 1) {
        onlineUserCounts.delete(socket.userId);
        io.emit('presence_update', { userId: socket.userId, isOnline: false });
      } else {
        onlineUserCounts.set(socket.userId, currentCount - 1);
      }

      // Clean up any group calls this user was in.
      // forEach không await async callback → trước đây save CALL message có thể
      // chạy sau khi handler kết thúc, gây race. Dùng for-of + snapshot entries
      // để vừa await tuần tự vừa tránh mutate trong khi iter.
      const callEntries = Array.from(activeGroupCalls.entries());
      for (const [callId, meta] of callEntries) {
        if (!meta.participants.has(socket.userId)) continue;

        meta.participants.delete(socket.userId);
        io.to(`gcall:${callId}`).emit('group_call_participant_left', {
          groupId: meta.groupId,
          callId,
          userId: socket.userId,
        });

        if (meta.participants.size === 0) {
          activeGroupCalls.delete(callId);

          const duration = meta.startedAt
            ? Math.floor((Date.now() - meta.startedAt) / 1000)
            : 0;
          const status = duration > 0 ? 'ended' : 'missed';

          const callContent = JSON.stringify({
            callId,
            callType: meta.callType,
            status,
            duration,
            groupName: meta.groupName,
          });

          try {
            const message = await groupMessageService.sendGroupMessage({
              groupId: meta.groupId,
              senderId: meta.callerId,
              senderRole: 'USER',
              type: 'CALL',
              content: callContent,
            });
            io.to(`group:${meta.groupId}`).emit('new_group_message', { groupId: meta.groupId, message });
          } catch (saveErr) {
            console.error('[GCALL] failed to save call message on disconnect:', saveErr.message);
          }

          io.to(`group:${meta.groupId}`).emit('group_call_ended', { groupId: meta.groupId, callId });

          // Also notify via personal rooms so users who haven't opened the group can dismiss the ringing
          const members = await groupMemberModel.listMembers(meta.groupId).catch(() => []);
          members
            .filter((member) => member.userId && member.userId !== socket.userId)
            .forEach((member) => {
              io.to(`user:${member.userId}`).emit('group_call_ended', { groupId: meta.groupId, callId });
            });
        }
      }
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = { registerChatHandlers };
