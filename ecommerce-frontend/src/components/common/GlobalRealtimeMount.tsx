import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationSocket } from '@/features/notification/hooks/useNotificationSocket';
import { useNotifications } from '@/features/notification/hooks/useNotifications';
import { useConversations } from '@/features/chat/hooks/useChat';
import { useChatSocket } from '@/features/chat/hooks/useChatSocket';
import { useMyGroups } from '@/features/chat/hooks/useGroup';
import { useGroupGlobalSocket } from '@/features/chat/hooks/useGroupSocket';
import { useVideoCall } from '@/features/chat/hooks/useVideoCall';
import IncomingCallNotification from '@/features/chat/components/IncomingCallNotification';
import VideoCallModal from '@/features/chat/components/VideoCallModal';

/**
 * Single global mount for ALL realtime sockets + the global incoming-call UI.
 * Rendered once at the App root so realtime works on every page (chat, seller,
 * admin, home, etc.) without being unmounted on route layout changes.
 *
 * The outer component only checks auth so the inner component remounts cleanly
 * after login (so socket refs pick up the freshly-authenticated socket).
 */
export default function GlobalRealtimeMount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);

  if (!isAuthenticated || !userId) return null;
  return <AuthenticatedRealtime key={userId} userId={userId} />;
}

function AuthenticatedRealtime({ userId }: { userId: string }) {
  // ─── Socket / query mounts ────────────────────────────────────────────────
  useNotificationSocket(userId);
  useNotifications(userId);
  useConversations();
  useMyGroups();
  useGroupGlobalSocket();

  // ─── Global incoming 1-1 call handler ─────────────────────────────────────
  const call = useChatStore((s) => s.call);
  const receiveCall = useChatStore((s) => s.receiveCall);
  const location = useLocation();
  const isOnChatPage = location.pathname === '/chat';

  const {
    localStream,
    remoteStream,
    answerCall,
    rejectCall,
    hangUp,
    cleanupCall,
    handleCallAnswered,
    handleSignal,
    toggleMute,
    toggleCamera,
  } = useVideoCall();

  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const isOnChatPageRef = useRef(isOnChatPage);
  isOnChatPageRef.current = isOnChatPage;

  // Register chat socket listeners globally — ChatPage skips its handlers when active
  useChatSocket(null, {
    onIncomingCall: (data) => {
      if (isOnChatPageRef.current) return;
      pendingOfferRef.current = data.offer;
      receiveCall(data.conversationId, data.callId, data.callType, data.callerId, data.callerName);
    },
    onCallAnswered: (data) => {
      if (isOnChatPageRef.current) return;
      handleCallAnswered(data.answer);
    },
    onCallRejected: () => {
      if (isOnChatPageRef.current) return;
      cleanupCall();
    },
    onCallEnded: () => {
      if (isOnChatPageRef.current) return;
      cleanupCall();
    },
    onSignal: (data) => {
      if (isOnChatPageRef.current) return;
      handleSignal(data.signal as { type: string; candidate?: RTCIceCandidateInit });
    },
  });

  // Don't render call modals when on ChatPage (it renders its own)
  if (isOnChatPage) return null;

  return (
    <>
      {call.callStatus === 'incoming' && (
        <IncomingCallNotification
          pendingOffer={pendingOfferRef.current}
          onAccept={(offer) => answerCall(offer)}
          onReject={rejectCall}
        />
      )}

      {(call.callStatus === 'calling' || call.callStatus === 'in_call') && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          participantName={call.callerName || 'Người dùng'}
          callType={call.callType}
          callStatus={call.callStatus}
          isInitiator={call.isInitiator}
          onHangUp={hangUp}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}
    </>
  );
}
