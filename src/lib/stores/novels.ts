import { derived, get, writable } from 'svelte/store';
import { api } from '../api/novels.js';
import type { CreateNovelRequest, Novel, ScrapingResponse, UpdateNovelRequest } from '../types/novel.js';

interface NovelsState {
	novels: Novel[];
	loading: boolean;
	error: string | null;
}

interface ScrapingState {
	loading: boolean;
	error: string | null;
	previewData: ScrapingResponse | null;
}

// Main novels store
function createNovelsStore() {
	const { subscribe, update } = writable<NovelsState>({
		novels: [],
		loading: false,
		error: null
	});

	// Scraping store for preview functionality
	const scrapingStore = writable<ScrapingState>({
		loading: false,
		error: null,
		previewData: null
	});

	return {
		subscribe,
		scraping: {
			subscribe: scrapingStore.subscribe
		},

		// Load all novels
		async loadNovels() {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const novels = await api.getNovels();
				// Add isFavorite property if not present (for backward compatibility)
				const novelsWithFavorite = novels.map(novel => ({
					...novel,
					isFavorite: novel.isFavorite ?? false
				}));
				
				update(state => ({ 
					...state, 
					novels: novelsWithFavorite, 
					loading: false 
				}));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load novels';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Create a new novel
		async createNovel(novelData: CreateNovelRequest) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const newNovel = await api.createNovel(novelData);
				const novelWithFavorite = { ...newNovel, isFavorite: false };
				
				update(state => ({ 
					...state, 
					novels: [...state.novels, novelWithFavorite],
					loading: false 
				}));
				
				return novelWithFavorite;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create novel';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Update an existing novel
		async updateNovel(id: number, updates: UpdateNovelRequest) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const updatedNovel = await api.updateNovel(id, updates);
				
				update(state => ({
					...state,
					novels: state.novels.map(novel => 
						novel.id === id 
							? { ...updatedNovel, isFavorite: novel.isFavorite }
							: novel
					),
					loading: false
				}));
				
				return updatedNovel;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update novel';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Delete a novel
		async deleteNovel(id: number) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				await api.deleteNovel(id);
				
				update(state => ({
					...state,
					novels: state.novels.filter(novel => novel.id !== id),
					loading: false
				}));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete novel';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Toggle favorite status (local only)
		toggleFavorite(id: number) {
			update(state => ({
				...state,
				novels: state.novels.map(novel =>
					novel.id === id 
						? { ...novel, isFavorite: !novel.isFavorite }
						: novel
				)
			}));
		},

		// Preview novel from URL
		async previewNovel(url: string) {
			scrapingStore.update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const previewData = await api.previewNovel({ url });
				scrapingStore.update(state => ({ 
					...state, 
					previewData, 
					loading: false 
				}));
				return previewData;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to preview novel';
				scrapingStore.update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Import novel from URL
		async importNovel(url: string) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const newNovel = await api.importNovel({ url });
				const novelWithFavorite = { ...newNovel, isFavorite: false };
				
				update(state => ({ 
					...state, 
					novels: [...state.novels, novelWithFavorite],
					loading: false 
				}));
				
				return novelWithFavorite;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to import novel';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Update novel from its source
		async updateFromSource(id: number) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const updatedNovel = await api.updateNovelFromSource(id);
				
				update(state => ({
					...state,
					novels: state.novels.map(novel => 
						novel.id === id 
							? { ...updatedNovel, isFavorite: novel.isFavorite }
							: novel
					),
					loading: false
				}));
				
				return updatedNovel;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update novel from source';
				update(state => ({ 
					...state, 
					loading: false, 
					error: errorMessage 
				}));
				throw error;
			}
		},

		// Clear error
		clearError() {
			update(state => ({ ...state, error: null }));
		},

		// Clear scraping data
		clearScrapingData() {
			scrapingStore.update(state => ({ 
				...state, 
				previewData: null, 
				error: null 
			}));
		},

		// Get specific novel by ID
		getNovel(id: number) {
			const state = get({ subscribe });
			return state.novels.find(novel => novel.id === id);
		}
	};
}

export const novelsStore = createNovelsStore();

// Derived stores for convenience
export const novels = derived(novelsStore, $store => $store.novels);
export const novelsLoading = derived(novelsStore, $store => $store.loading);
export const novelsError = derived(novelsStore, $store => $store.error);

// Filtered novels
export const favoriteNovels = derived(novels, $novels => 
	$novels.filter(novel => novel.isFavorite)
);

export const novelsByStatus = derived(novels, $novels => {
	return (status: string) => {
		if (status === 'All Status') return $novels;
		return $novels.filter(novel => novel.user_status === status);
	};
});

export const novelsByGenre = derived(novels, $novels => {
	return (genre: string) => {
		if (genre === 'All Genres') return $novels;
		return $novels.filter(novel => novel.genres.includes(genre));
	};
});

export const searchNovels = derived(novels, $novels => {
	return (query: string) => {
		if (!query.trim()) return $novels;
		const searchTerm = query.toLowerCase();
		return $novels.filter(novel => 
			novel.title.toLowerCase().includes(searchTerm) ||
			novel.author.toLowerCase().includes(searchTerm) ||
			novel.description.toLowerCase().includes(searchTerm)
		);
	};
});

// Combined filter function
export const filteredNovels = derived(novels, $novels => {
	return (searchQuery: string, statusFilter: string, genreFilter: string) => {
		let filtered = $novels;
		
		// Apply search filter
		if (searchQuery.trim()) {
			const searchTerm = searchQuery.toLowerCase();
			filtered = filtered.filter(novel => 
				novel.title.toLowerCase().includes(searchTerm) ||
				novel.author.toLowerCase().includes(searchTerm) ||
				novel.description.toLowerCase().includes(searchTerm)
			);
		}
		
		// Apply status filter
		if (statusFilter !== 'All Status') {
			filtered = filtered.filter(novel => novel.user_status === statusFilter);
		}
		
		// Apply genre filter
		if (genreFilter !== 'All Genres') {
			filtered = filtered.filter(novel => novel.genres.includes(genreFilter));
		}
		
		return filtered;
	};
}); 