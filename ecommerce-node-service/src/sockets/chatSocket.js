const chatService = require('../services/chatService');

const registerChatHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(conversationId);
      console.log(`${socket.userId} joined room ${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, type, content }) => {
      try {
        const { message } = await chatService.sendMessage({
          conversationId,
          senderId: socket.userId,
          senderRole: socket.userRole,
          type: type || 'TEXT',
          content,
        });

        io.to(conversationId).emit('new_message', { message });
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

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = { registerChatHandlers };
