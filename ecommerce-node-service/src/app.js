require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes');
const { initSocket } = require('./config/socket');
const { registerChatHandlers } = require('./sockets/chatSocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8088;

app.use(cors());
app.use(express.json());

app.get('/chat/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service' });
});

app.use('/chat', chatRoutes);

const io = initSocket(server);
registerChatHandlers(io);

server.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});

module.exports = { app, server, io };
