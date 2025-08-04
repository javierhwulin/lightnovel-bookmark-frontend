import { derived, writable } from 'svelte/store';
import { api } from '../api/novels.js';
import type { CreateNovelRequest, EnhancedNovel, Novel, ScrapingResponse, UpdateNovelRequest } from '../types/novel.js';
import { getUserNovelData, userPreferencesStore } from './user-preferences.js';

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

				update(state => ({
					...state,
					novels,
					loading: false
				}));

				// Also load user preferences to ensure they're in sync
				await userPreferencesStore.loadPreferences();
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

				update(state => ({
					...state,
					novels: [...state.novels, newNovel],
					loading: false
				}));

				return newNovel;
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
						novel.id === id ? updatedNovel : novel
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

				// Also remove user preferences for this novel
				try {
					await api.deleteUserPreference(id);
				} catch (prefError) {
					// It's okay if preferences don't exist
					console.warn('Failed to delete user preferences:', prefError);
				}
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

		// Get a single novel by ID
		async getNovel(id: number) {
			try {
				return await api.getNovel(id);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to get novel';
				update(state => ({ ...state, error: errorMessage }));
				throw error;
			}
		},

		// Preview a novel from scraping
		async previewNovel(url: string) {
			scrapingStore.update(state => ({ ...state, loading: true, error: null }));

			try {
				const previewData = await api.previewNovel({ url });

				scrapingStore.update(state => ({
					...state,
					loading: false,
					previewData
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

		// Import a novel directly
		async importNovel(url: string) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const novel = await api.importNovel({ url });

				update(state => ({
					...state,
					novels: [...state.novels, novel],
					loading: false
				}));

				return novel;
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

		// Import novel in background
		async importNovelBackground(url: string) {
			try {
				return await api.importNovelBackground({ url });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to start background import';
				scrapingStore.update(state => ({ ...state, error: errorMessage }));
				throw error;
			}
		},

		// Update novel from source
		async updateNovelFromSource(id: number) {
			try {
				const updatedNovel = await api.updateNovelFromSource(id);

				update(state => ({
					...state,
					novels: state.novels.map(novel =>
						novel.id === id ? updatedNovel : novel
					)
				}));

				return updatedNovel;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update novel from source';
				update(state => ({ ...state, error: errorMessage }));
				throw error;
			}
		},

		// Clear error state
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
		}
	};
}

// Create the store instance
export const novelsStore = createNovelsStore();

// Enhanced novels that combine backend data with user preferences
export const enhancedNovels = derived(
	[novelsStore, userPreferencesStore],
	([$novels, $userPrefs]) => {
		return $novels.novels.map((novel): EnhancedNovel => {
			const userData = getUserNovelData(novel.id, $userPrefs.preferences);
			const userPreference = $userPrefs.preferences[novel.id];

			return {
				...novel,
				userPreference,
				// Legacy compatibility fields
				userStatus: userData.userStatus,
				isFavorite: userData.isFavorite,
				currentChapter: userData.currentChapter,
				rating: userData.rating,
				personalNotes: userData.personalNotes,
				dateStarted: userData.dateStarted,
				dateCompleted: userData.dateCompleted
			};
		});
	}
);

// Derived stores for common use cases
export const novelsLoading = derived(novelsStore, $store => $store.loading);
export const novelsError = derived(novelsStore, $store => $store.error);

// Filtered novels based on search and filters
export const filteredNovels = derived(
	enhancedNovels,
	$novels => (searchQuery: string, statusFilter: string, genreFilter: string) => {
		let filtered = $novels;

		// Apply search filter
		if (searchQuery.trim()) {
			const searchTerm = searchQuery.toLowerCase();
			filtered = filtered.filter(
				novel =>
					novel.title.toLowerCase().includes(searchTerm) ||
					novel.author.toLowerCase().includes(searchTerm) ||
					novel.description.toLowerCase().includes(searchTerm)
			);
		}

		// Apply status filter
		if (statusFilter !== 'All Status') {
			filtered = filtered.filter(novel => novel.userStatus === statusFilter);
		}

		// Apply genre filter
		if (genreFilter !== 'All Genres') {
			filtered = filtered.filter(novel => novel.genres.includes(genreFilter));
		}

		return filtered;
	}
);

// Favorite novels
export const favoriteNovels = derived(
	enhancedNovels,
	$novels => $novels.filter(novel => novel.isFavorite)
);

// Currently reading novels
export const currentlyReading = derived(
	enhancedNovels,
	$novels => $novels.filter(novel => novel.userStatus === 'Reading')
);

// Available genres from all novels
export const availableGenres = derived(
	enhancedNovels,
	$novels => {
		const genres = new Set<string>();
		$novels.forEach(novel => {
			novel.genres.forEach(genre => genres.add(genre));
		});
		return Array.from(genres).sort();
	}
);

// Export the enhanced novel type for components
export type { EnhancedNovel };
