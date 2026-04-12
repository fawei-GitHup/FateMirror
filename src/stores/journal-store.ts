import { create } from 'zustand';
import type { Journal } from '@/types';

interface JournalState {
  journals: Journal[];
  isLoading: boolean;
  currentJournal: Journal | null;

  setJournals: (journals: Journal[]) => void;
  setCurrentJournal: (journal: Journal | null) => void;
  addJournal: (journal: Journal) => void;
  removeJournal: (id: string) => void;
  clear: () => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  journals: [],
  isLoading: false,
  currentJournal: null,

  setJournals: (journals) => set({ journals }),
  setCurrentJournal: (journal) => set({ currentJournal: journal }),

  addJournal: (journal) =>
    set((state) => ({ journals: [journal, ...state.journals] })),

  removeJournal: (id) =>
    set((state) => ({
      journals: state.journals.filter((j) => j.id !== id),
      currentJournal:
        state.currentJournal?.id === id ? null : state.currentJournal,
    })),

  clear: () => set({ journals: [], currentJournal: null, isLoading: false }),
}));
