import { Client } from '@stomp/stompjs';

let stompClient: Client | null = null;

export const getStompClient = (): Client => {
  if (!stompClient) {
    stompClient = new Client({
      brokerURL: (import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:8087/ws').replace(/^http/, 'ws'),
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.warn('[STOMP] STOMP error:', frame.headers?.message);
      },
      onWebSocketError: (error) => {
        console.warn('[STOMP] WebSocket error:', error);
      },
      onDisconnect: () => {
        console.debug('[STOMP] Disconnected');
      },
    });
  }
  return stompClient;
};

export const disconnectStomp = () => {
  if (stompClient) {
    stompClient.deactivate().catch(() => {});
    stompClient = null;
  }
};
