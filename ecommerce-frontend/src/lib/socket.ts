import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem('access_token') },
      // Start with websocket directly to avoid HTTP polling rate limits from localhost.run
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[socket] connected, id:', socket?.id, 'transport:', (socket as Socket & { io: { engine: { transport: { name: string } } } }).io.engine.transport.name);
    });
    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnected:', reason);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
