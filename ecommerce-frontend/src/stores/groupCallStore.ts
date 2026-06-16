import { create } from 'zustand';
import { useChatStore } from './chatStore';

export type GroupCallStatus = 'idle' | 'ringing' | 'in_call';

export interface ActiveCallInfo {
  callId: string;
  callType: 'video' | 'audio';
  callerName: string;
}

export interface GroupCallState {
  groupId: string | null;
  groupName: string | null;
  callId: string | null;
  callType: 'video' | 'audio';
  status: GroupCallStatus;
  callerId: string | null;
  callerName: string | null;
  isInitiator: boolean;
  // Tracks active calls in groups where this user is NOT currently participating
  activeCallsByGroup: Record<string, ActiveCallInfo>;
}

interface GroupCallStore extends GroupCallState {
  startGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio') => void;
  receiveGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio', callerId: string, callerName: string) => void;
  joinedGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio') => void;
  endGroupCall: () => void;
  setActiveCallForGroup: (groupId: string, info: ActiveCallInfo | null) => void;
}

const defaultState: GroupCallState = {
  groupId: null,
  groupName: null,
  callId: null,
  callType: 'video',
  status: 'idle',
  callerId: null,
  callerName: null,
  isInitiator: false,
  activeCallsByGroup: {},
};

export const useGroupCallStore = create<GroupCallStore>()((set) => ({
  ...defaultState,

  startGroupCall: (groupId, groupName, callId, callType) =>
    set((state) => ({
      ...state,
      groupId, groupName, callId, callType, status: 'in_call', callerId: null, callerName: null, isInitiator: true,
      // Clear the "pending join" entry since we're now initiating
      activeCallsByGroup: { ...state.activeCallsByGroup, [groupId]: undefined as unknown as ActiveCallInfo },
    })),

  receiveGroupCall: (groupId, groupName, callId, callType, callerId, callerName) =>
    set((state) => {
      // Duplicate event for the same call — no-op
      if (state.callId === callId) return state;
      // Busy with another group call (ringing or in_call) → drop the new one
      if (state.status !== 'idle') return state;
      // Cross-store guard — already in / ringing a 1-1 call
      const oneOnOne = useChatStore.getState().call;
      if (oneOnOne.callStatus !== 'idle') return state;
      return { ...state, groupId, groupName, callId, callType, status: 'ringing', callerId, callerName, isInitiator: false };
    }),

  joinedGroupCall: (groupId, groupName, callId, callType) =>
    set((state) => ({ ...state, groupId, groupName, callId, callType, status: 'in_call' })),

  endGroupCall: () => set((state) => ({ ...defaultState, activeCallsByGroup: state.activeCallsByGroup })),

  setActiveCallForGroup: (groupId, info) =>
    set((state) => {
      const next = { ...state.activeCallsByGroup };
      if (info) {
        next[groupId] = info;
      } else {
        delete next[groupId];
      }
      return { ...state, activeCallsByGroup: next };
    }),
}));
