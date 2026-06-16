const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch (err) {
      next(new Error('UNAUTHORIZED'));
    }
  });

  return io;
};

module.exports = { initSocket };
