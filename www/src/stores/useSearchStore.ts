import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { GlobalSearchResult } from '@/api/commands';

interface SearchState {
    isOpen: boolean;
    term: string;
    results: GlobalSearchResult[];
    isLoading: boolean;
    selectedIndex: number;
    
    setOpen: (open: boolean) => void;
    setTerm: (term: string) => void;
    setResults: (results: GlobalSearchResult[]) => void;
    performSearch: (term: string, db?: string) => Promise<void>;
    moveSelection: (direction: 'up' | 'down') => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
    isOpen: false,
    term: '',
    results: [],
    isLoading: false,
    selectedIndex: 0,

    setOpen: (open) => set({ isOpen: open, term: '', results: [], selectedIndex: 0 }),
    
    setTerm: (term) => set({ term }),
    
    setResults: (results) => set({ results, selectedIndex: 0 }),

    performSearch: async (term, db) => {
        if (!term || term.length < 2) {
            set({ results: [], isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const results = await invoke<GlobalSearchResult[]>('global_search', { term, db });
            set({ results, isLoading: false, selectedIndex: 0 });
        } catch (error) {
            console.error("Search failed:", error);
            set({ results: [], isLoading: false });
        }
    },

    moveSelection: (direction) => {
        const { results, selectedIndex } = get();
        if (results.length === 0) return;

        let newIndex = direction === 'up' ? selectedIndex - 1 : selectedIndex + 1;
        
        if (newIndex < 0) newIndex = results.length - 1;
        if (newIndex >= results.length) newIndex = 0;

        set({ selectedIndex: newIndex });
    }
}));
