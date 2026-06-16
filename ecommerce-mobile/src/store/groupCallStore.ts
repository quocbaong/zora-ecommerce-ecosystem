import { create } from 'zustand';

export type GroupCallStatus = 'idle' | 'ringing' | 'in_call';

export interface GroupParticipant {
  userId: string;
  name: string;
  streamURL: string | null;
}

export interface ActiveCallInfo {
  groupId: string;
  callId: string;
  callType: 'video' | 'audio';
  startedAt: Date;
  callerId?: string;
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
  participants: Record<string, GroupParticipant>;
  activeCallsByGroup: Record<string, ActiveCallInfo>;
}

interface GroupCallStore extends GroupCallState {
  startGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio') => void;
  receiveGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio', callerId: string, callerName: string) => void;
  joinedGroupCall: (groupId: string, groupName: string, callId: string, callType: 'video' | 'audio') => void;
  updateParticipantStream: (userId: string, streamURL: string | null, name?: string) => void;
  removeParticipant: (userId: string) => void;
  setParticipants: (participants: Record<string, GroupParticipant>) => void;
  endGroupCall: () => void;
  setActiveCallInfo: (groupId: string, info: ActiveCallInfo | null) => void;
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
  participants: {},
  activeCallsByGroup: {},
};

export const useGroupCallStore = create<GroupCallStore>()((set) => ({
  ...defaultState,

  startGroupCall: (groupId, groupName, callId, callType) =>
    set((state) => ({ 
      ...defaultState,
      activeCallsByGroup: state.activeCallsByGroup,
      groupId, 
      groupName, 
      callId, 
      callType, 
      status: 'in_call', 
      isInitiator: true 
    })),

  receiveGroupCall: (groupId, groupName, callId, callType, callerId, callerName) =>
    set((state) => {
      if (state.status === 'in_call') return state;
      if (state.callId === callId) return state;
      return { 
        ...defaultState,
        activeCallsByGroup: state.activeCallsByGroup,
        groupId, 
        groupName, 
        callId, 
        callType, 
        status: 'ringing', 
        callerId, 
        callerName, 
        isInitiator: false 
      };
    }),

  joinedGroupCall: (groupId, groupName, callId, callType) =>
    set((state) => ({ ...state, groupId, groupName, callId, callType, status: 'in_call' })),

  updateParticipantStream: (userId, streamURL, name) =>
    set((state) => ({
      participants: {
        ...state.participants,
        [userId]: { 
          ...(state.participants[userId] || { userId, name: name || 'Người dùng' }),
          name: name || state.participants[userId]?.name || 'Người dùng',
          streamURL 
        }
      }
    })),

  removeParticipant: (userId) =>
    set((state) => {
      const next = { ...state.participants };
      delete next[userId];
      return { participants: next };
    }),

  setParticipants: (participants) => set({ participants }),

  endGroupCall: () => set((state) => ({ 
    ...defaultState,
    activeCallsByGroup: state.activeCallsByGroup 
  })),

  setActiveCallInfo: (groupId, info) => set((state) => {
    console.log('[STORE] setActiveCallInfo:', groupId, info ? `callId=${info.callId}` : 'null (clearing)');
    const next = { ...state.activeCallsByGroup };
    if (info) {
      next[groupId] = info;
    } else {
      delete next[groupId];
    }
    return { activeCallsByGroup: next };
  }),
}));
