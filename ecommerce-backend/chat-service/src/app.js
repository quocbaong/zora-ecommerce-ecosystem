require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes');
const { initSocket } = require('./config/socket');
const { registerChatHandlers } = require('./sockets/chatSocket');
const { registerOrderEventsConsumer } = require('./sockets/orderEventsConsumer');
const reminderService = require('./services/reminderService');
const pollService = require('./services/pollService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8088;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/chat/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service' });
});

app.use('/chat', chatRoutes);

// Fallback for route not found
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

const io = initSocket(server);
registerChatHandlers(io);
registerOrderEventsConsumer(io);

server.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});

// Reminder cron — check every 60 seconds
setInterval(reminderService.checkDueReminders, 60 * 1000);
// Poll auto-close cron — check every 30 seconds
setInterval(pollService.checkAutoClosePolls, 30 * 1000);

module.exports = { app, server, io };
