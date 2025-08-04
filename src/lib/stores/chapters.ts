import { derived, writable } from 'svelte/store';
import { api } from '../api/novels.js';
import type { Chapter, CreateChapterRequest, UpdateChapterRequest } from '../types/novel.js';

interface ChaptersState {
    chapters: Chapter[];
    loading: boolean;
    error: string | null;
    currentNovelId: number | null;
}

// Chapters store
function createChaptersStore() {
    const { subscribe, update } = writable<ChaptersState>({
        chapters: [],
        loading: false,
        error: null,
        currentNovelId: null
    });

    return {
        subscribe,

        // Load chapters for a specific novel
        async loadChapters(novelId: number) {
            update(state => ({ ...state, loading: true, error: null, currentNovelId: novelId }));

            try {
                const chapters = await api.getChapters(novelId);
                // Sort chapters by number for consistent display
                const sortedChapters = chapters.sort((a, b) => a.number - b.number);

                update(state => ({
                    ...state,
                    chapters: sortedChapters,
                    loading: false
                }));

                return sortedChapters;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load chapters';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        // Get a specific chapter
        async getChapter(novelId: number, chapterId: number) {
            try {
                return await api.getChapter(novelId, chapterId);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to get chapter';
                update(state => ({ ...state, error: errorMessage }));
                throw error;
            }
        },

        // Create a new chapter
        async createChapter(novelId: number, chapterData: CreateChapterRequest) {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const newChapter = await api.createChapter(novelId, chapterData);

                update(state => ({
                    ...state,
                    chapters: [...state.chapters, newChapter].sort((a, b) => a.number - b.number),
                    loading: false
                }));

                return newChapter;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to create chapter';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        // Update an existing chapter
        async updateChapter(novelId: number, chapterId: number, updates: UpdateChapterRequest) {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const updatedChapter = await api.updateChapter(novelId, chapterId, updates);

                update(state => ({
                    ...state,
                    chapters: state.chapters
                        .map(chapter => chapter.id === chapterId ? updatedChapter : chapter)
                        .sort((a, b) => a.number - b.number),
                    loading: false
                }));

                return updatedChapter;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to update chapter';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        // Delete a chapter
        async deleteChapter(novelId: number, chapterId: number) {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                await api.deleteChapter(novelId, chapterId);

                update(state => ({
                    ...state,
                    chapters: state.chapters.filter(chapter => chapter.id !== chapterId),
                    loading: false
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to delete chapter';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        // Clear chapters (e.g., when navigating away)
        clearChapters() {
            update(state => ({
                ...state,
                chapters: [],
                currentNovelId: null,
                error: null
            }));
        },

        // Clear error
        clearError() {
            update(state => ({ ...state, error: null }));
        }
    };
}

export const chaptersStore = createChaptersStore();

// Derived stores for convenience
export const chapters = derived(chaptersStore, $store => $store.chapters);
export const chaptersLoading = derived(chaptersStore, $store => $store.loading);
export const chaptersError = derived(chaptersStore, $store => $store.error);
export const currentNovelId = derived(chaptersStore, $store => $store.currentNovelId);

// Helper derived stores
export const chaptersCount = derived(chapters, $chapters => $chapters.length);

export const latestChapter = derived(chapters, $chapters => {
    if ($chapters.length === 0) return null;
    return $chapters.reduce((latest, chapter) =>
        chapter.number > latest.number ? chapter : latest
    );
});

export const chapterByNumber = derived(chapters, $chapters => {
    return (number: number) => $chapters.find(chapter => chapter.number === number);
}); 