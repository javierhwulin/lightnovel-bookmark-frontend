import { derived, writable } from 'svelte/store';
import { api } from '../api/novels.js';
import type {
    UserPreference
} from '../types/novel.js';

// User reading statuses
export const USER_STATUSES = [
    'Reading',
    'Wishlist',
    'Completed',
    'On Hold',
    'Dropped'
] as const;

export type UserStatus = typeof USER_STATUSES[number];

interface UserPreferencesState {
    preferences: Record<number, UserPreference>; // novelId -> UserPreference
    loading: boolean;
    error: string | null;
}

// Create the user preferences store
function createUserPreferencesStore() {
    const { subscribe, update } = writable<UserPreferencesState>({
        preferences: {},
        loading: false,
        error: null
    });

    return {
        subscribe,

        // Load all user preferences from backend
        async loadPreferences() {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const preferences = await api.getUserPreferences();
                const preferencesMap = preferences.reduce((acc, pref) => {
                    acc[pref.novel_id] = pref;
                    return acc;
                }, {} as Record<number, UserPreference>);

                update(state => ({
                    ...state,
                    preferences: preferencesMap,
                    loading: false
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load preferences';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                console.error('Failed to load user preferences:', error);
            }
        },

        // Get user preference for a specific novel
        async getUserPreference(novelId: number): Promise<UserPreference | null> {
            try {
                return await api.getUserPreference(novelId);
            } catch (error) {
                console.warn(`Failed to get preference for novel ${novelId}:`, error);
                return null;
            }
        },

        // Set user status for a novel
        async setUserStatus(novelId: number, status: UserStatus) {
            try {
                const updated = await api.updateUserStatus(novelId, status);
                update(state => ({
                    ...state,
                    preferences: {
                        ...state.preferences,
                        [novelId]: updated
                    }
                }));
            } catch (error) {
                // If preference doesn't exist, create it
                if (error instanceof Error && error.message.includes('404')) {
                    try {
                        const created = await api.createUserPreference(novelId, { status });
                        update(state => ({
                            ...state,
                            preferences: {
                                ...state.preferences,
                                [novelId]: created
                            }
                        }));
                    } catch (createError) {
                        console.error('Failed to create user preference:', createError);
                        const errorMessage = createError instanceof Error ? createError.message : 'Failed to set status';
                        update(state => ({ ...state, error: errorMessage }));
                    }
                } else {
                    console.error('Failed to update user status:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to set status';
                    update(state => ({ ...state, error: errorMessage }));
                }
            }
        },

        // Toggle favorite status
        async toggleFavorite(novelId: number) {
            try {
                const currentPref = await this.getUserPreference(novelId);
                const newFavoriteStatus = !currentPref?.is_favorite;

                const updated = await api.updateUserPreference(novelId, {
                    is_favorite: newFavoriteStatus
                });

                update(state => ({
                    ...state,
                    preferences: {
                        ...state.preferences,
                        [novelId]: updated
                    }
                }));
            } catch (error) {
                // If preference doesn't exist, create it
                if (error instanceof Error && error.message.includes('404')) {
                    try {
                        const created = await api.createUserPreference(novelId, { is_favorite: true });
                        update(state => ({
                            ...state,
                            preferences: {
                                ...state.preferences,
                                [novelId]: created
                            }
                        }));
                    } catch (createError) {
                        console.error('Failed to create user preference:', createError);
                        const errorMessage = createError instanceof Error ? createError.message : 'Failed to toggle favorite';
                        update(state => ({ ...state, error: errorMessage }));
                    }
                } else {
                    console.error('Failed to toggle favorite:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to toggle favorite';
                    update(state => ({ ...state, error: errorMessage }));
                }
            }
        },

        // Set rating for a novel
        async setRating(novelId: number, rating: number | undefined) {
            try {
                const updated = await api.updateUserPreference(novelId, { rating });
                update(state => ({
                    ...state,
                    preferences: {
                        ...state.preferences,
                        [novelId]: updated
                    }
                }));
            } catch (error) {
                // If preference doesn't exist, create it
                if (error instanceof Error && error.message.includes('404')) {
                    try {
                        const created = await api.createUserPreference(novelId, { rating });
                        update(state => ({
                            ...state,
                            preferences: {
                                ...state.preferences,
                                [novelId]: created
                            }
                        }));
                    } catch (createError) {
                        console.error('Failed to create user preference:', createError);
                        const errorMessage = createError instanceof Error ? createError.message : 'Failed to set rating';
                        update(state => ({ ...state, error: errorMessage }));
                    }
                } else {
                    console.error('Failed to set rating:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to set rating';
                    update(state => ({ ...state, error: errorMessage }));
                }
            }
        },

        // Set personal notes
        async setPersonalNotes(novelId: number, notes: string) {
            try {
                const updated = await api.updateUserPreference(novelId, { personal_notes: notes });
                update(state => ({
                    ...state,
                    preferences: {
                        ...state.preferences,
                        [novelId]: updated
                    }
                }));
            } catch (error) {
                // If preference doesn't exist, create it
                if (error instanceof Error && error.message.includes('404')) {
                    try {
                        const created = await api.createUserPreference(novelId, { personal_notes: notes });
                        update(state => ({
                            ...state,
                            preferences: {
                                ...state.preferences,
                                [novelId]: created
                            }
                        }));
                    } catch (createError) {
                        console.error('Failed to create user preference:', createError);
                        const errorMessage = createError instanceof Error ? createError.message : 'Failed to set notes';
                        update(state => ({ ...state, error: errorMessage }));
                    }
                } else {
                    console.error('Failed to set personal notes:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Failed to set notes';
                    update(state => ({ ...state, error: errorMessage }));
                }
            }
        },

        // Update reading progress
        async updateProgress(novelId: number, currentChapter: number) {
            try {
                const updated = await api.updateReadingProgress(novelId, currentChapter);
                update(state => ({
                    ...state,
                    preferences: {
                        ...state.preferences,
                        [novelId]: updated
                    }
                }));
            } catch (error) {
                console.error('Failed to update reading progress:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to update progress';
                update(state => ({ ...state, error: errorMessage }));
            }
        },

        // Clear error state
        clearError() {
            update(state => ({ ...state, error: null }));
        }
    };
}

// Create the store instance
export const userPreferencesStore = createUserPreferencesStore();

// Helper function to get user data for a novel (legacy compatibility)
export function getUserNovelData(novelId: number, preferences: Record<number, UserPreference>) {
    const pref = preferences[novelId];
    if (!pref) return {};

    return {
        userStatus: pref.status,
        isFavorite: pref.is_favorite,
        currentChapter: pref.current_chapter,
        rating: pref.rating,
        personalNotes: pref.personal_notes,
        dateStarted: pref.date_started,
        dateCompleted: pref.date_completed
    };
}

// Derived stores for easy access to user data
export const userNovelsData = derived(userPreferencesStore, $prefs => $prefs.preferences);

// Get user data for a specific novel
export const getUserNovelDataDerived = derived(userPreferencesStore, $prefs => {
    return (novelId: number) => getUserNovelData(novelId, $prefs.preferences);
});

// Get novels by user status
export const novelsByUserStatus = derived(userPreferencesStore, $prefs => {
    return (status: UserStatus | 'All Status') => {
        if (status === 'All Status') return Object.keys($prefs.preferences).map(Number);

        return Object.entries($prefs.preferences)
            .filter(([, data]) => data.status === status)
            .map(([id]) => Number(id));
    };
});

// Get favorite novel IDs
export const favoriteNovelIds = derived(userPreferencesStore, $prefs => {
    return Object.entries($prefs.preferences)
        .filter(([, data]) => data.is_favorite)
        .map(([id]) => Number(id));
});

// Get available user statuses that are actually in use
export const availableUserStatuses = derived(userPreferencesStore, $prefs => {
    const statuses = new Set<UserStatus>();
    Object.values($prefs.preferences).forEach(data => {
        if (data.status && USER_STATUSES.includes(data.status as UserStatus)) {
            statuses.add(data.status as UserStatus);
        }
    });
    return ['All Status', ...USER_STATUSES.filter(status => statuses.has(status))];
});

// Reading statistics
export const readingStats = derived(userPreferencesStore, $prefs => {
    const stats = {
        total: 0,
        reading: 0,
        completed: 0,
        onHold: 0,
        dropped: 0,
        wishlist: 0,
        favorites: 0
    };

    Object.values($prefs.preferences).forEach(data => {
        stats.total++;
        if (data.is_favorite) stats.favorites++;

        switch (data.status) {
            case 'Reading':
                stats.reading++;
                break;
            case 'Completed':
                stats.completed++;
                break;
            case 'On Hold':
                stats.onHold++;
                break;
            case 'Dropped':
                stats.dropped++;
                break;
            case 'Wishlist':
                stats.wishlist++;
                break;
        }
    });

    return stats;
}); 