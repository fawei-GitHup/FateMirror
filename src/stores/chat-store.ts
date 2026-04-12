import { create } from 'zustand';
import type { ChatMessage } from '@/hooks/useChat';

interface ChatState {
  messages: ChatMessage[];
  mode: 'chat' | 'guided';
  isSessionComplete: boolean;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setMode: (mode: 'chat' | 'guided') => void;
  setSessionComplete: (complete: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  mode: 'chat',
  isSessionComplete: false,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMode: (mode) => set({ mode, messages: [], isSessionComplete: false }),

  setSessionComplete: (complete) => set({ isSessionComplete: complete }),

  clear: () =>
    set({ messages: [], mode: 'chat', isSessionComplete: false }),
}));
