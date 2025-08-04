import { derived, writable } from 'svelte/store';
import { api } from '../api/novels.js';
import type {
    CreateReadingSessionRequest,
    NovelReadingStatistics,
    ReadingSession,
    ReadingStatistics,
    UpdateReadingSessionRequest
} from '../types/novel.js';

interface ReadingSessionsState {
    sessions: ReadingSession[];
    activeSessions: Map<number, ReadingSession>; // novelId -> active session
    loading: boolean;
    error: string | null;
    statistics: ReadingStatistics | null;
}

// Create the reading sessions store
function createReadingSessionsStore() {
    const { subscribe, update } = writable<ReadingSessionsState>({
        sessions: [],
        activeSessions: new Map(),
        loading: false,
        error: null,
        statistics: null
    });

    return {
        subscribe,

        // Load reading sessions with optional filters
        async loadSessions(filters?: { novel_id?: number; limit?: number; offset?: number }) {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const sessions = await api.getReadingSessions(filters);
                update(state => ({
                    ...state,
                    sessions,
                    loading: false
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load reading sessions';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                console.error('Failed to load reading sessions:', error);
            }
        },

        // Start a new reading session
        async startSession(novelId: number, chapterNumber?: number) {
            try {
                const sessionData: CreateReadingSessionRequest = {
                    chapter_number: chapterNumber,
                    device_type: 'web'
                };

                console.log(`Starting reading session for novel ${novelId}`);

                const session = await api.startReadingSession(novelId, sessionData);

                update(state => ({
                    ...state,
                    activeSessions: new Map(state.activeSessions).set(novelId, session),
                    sessions: [session, ...state.sessions]
                }));

                return session;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to start reading session';
                update(state => ({ ...state, error: errorMessage }));
                console.error('Failed to start reading session:', error);
                throw error;
            }
        },

        // End an active reading session
        async endSession(novelId: number, finalChapter?: number, onSessionEnded?: () => void) {
            try {
                const activeSession = this.getActiveSession(novelId);
                if (!activeSession) {
                    throw new Error('No active session found for this novel');
                }

                // Calculate session duration in minutes
                // Backend sends timestamps without timezone, treat them as UTC
                let startTimeStr = activeSession.started_at;

                // Check for timezone indicators (but not the date dashes)
                const hasTimezone = startTimeStr.includes('Z') ||
                    startTimeStr.includes('+') ||
                    /T\d{2}:\d{2}:\d{2}.*[-+]\d{2}/.test(startTimeStr); // Look for timezone offset after time

                // Method 1: Add Z to indicate UTC
                if (!hasTimezone) {
                    startTimeStr = startTimeStr + 'Z';
                }

                const startTime = new Date(startTimeStr);

                // Method 2: Alternative approach - parse as UTC explicitly
                let startTimeAlt;
                const timestamp = activeSession.started_at;
                if (!hasTimezone) {
                    // Parse as UTC by manually extracting components
                    const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.?(\d+)?/);
                    if (match) {
                        const [, year, month, day, hour, minute, second, ms = '0'] = match;
                        startTimeAlt = new Date(Date.UTC(
                            parseInt(year),
                            parseInt(month) - 1, // Month is 0-indexed
                            parseInt(day),
                            parseInt(hour),
                            parseInt(minute),
                            parseInt(second),
                            parseInt(ms.padEnd(3, '0').substring(0, 3)) // Ensure 3 digits for milliseconds
                        ));
                    }
                }

                const endTime = new Date();

                // Use the alternative method if available, otherwise use method 1
                const finalStartTime = startTimeAlt || startTime;

                // Validate timestamps
                if (isNaN(finalStartTime.getTime())) {
                    console.error('Invalid start time:', activeSession.started_at);
                    throw new Error('Invalid session start time');
                }

                const durationMs = endTime.getTime() - finalStartTime.getTime();

                // Handle negative durations (clock issues) or very short durations
                let durationMinutes;
                if (durationMs < 0) {
                    console.warn('Negative duration detected, using 1 minute minimum');
                    durationMinutes = 1;
                } else if (durationMs < 60000) { // Less than 1 minute
                    durationMinutes = 1; // Minimum 1 minute
                } else {
                    durationMinutes = Math.floor(durationMs / (1000 * 60));
                }

                console.log(`📖 Reading session ended: ${durationMinutes} minutes (${Math.round(durationMs / 1000)}s actual)`);

                const updateData: UpdateReadingSessionRequest = {
                    duration_minutes: durationMinutes
                };

                if (finalChapter !== undefined) {
                    updateData.chapter_number = finalChapter;
                }

                const endedSession = await api.endReadingSession(activeSession.id, updateData);

                update(state => {
                    const newActiveSessions = new Map(state.activeSessions);
                    newActiveSessions.delete(novelId);

                    return {
                        ...state,
                        activeSessions: newActiveSessions,
                        sessions: state.sessions.map(s => s.id === endedSession.id ? endedSession : s)
                    };
                });

                // Call the callback to refresh stats if provided
                if (onSessionEnded) {
                    onSessionEnded();
                }

                return endedSession;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to end reading session';
                update(state => ({ ...state, error: errorMessage }));
                console.error('Failed to end reading session:', error);
                throw error;
            }
        },

        // Get active session for a novel
        getActiveSession(novelId: number): ReadingSession | undefined {
            let activeSession: ReadingSession | undefined;
            subscribe(state => {
                activeSession = state.activeSessions.get(novelId);
            })();
            return activeSession;
        },

        // Check if a novel has an active reading session
        hasActiveSession(novelId: number): boolean {
            return this.getActiveSession(novelId) !== undefined;
        },

        // Load reading statistics
        async loadStatistics() {
            try {
                const statistics = await api.getReadingStatistics();
                update(state => ({ ...state, statistics }));
                return statistics;
            } catch (error) {
                console.error('Failed to load reading statistics:', error);
                throw error;
            }
        },

        // Get statistics for a specific novel
        async getNovelStatistics(novelId: number): Promise<NovelReadingStatistics> {
            try {
                return await api.getNovelReadingStatistics(novelId);
            } catch (error) {
                console.error('Failed to load novel statistics:', error);
                throw error;
            }
        },

        // Clear error state
        clearError() {
            update(state => ({ ...state, error: null }));
        },

        // Clear all data (useful for logout or reset)
        clear() {
            update(() => ({
                sessions: [],
                activeSessions: new Map(),
                loading: false,
                error: null,
                statistics: null
            }));
        }
    };
}

// Create the store instance
export const readingSessionsStore = createReadingSessionsStore();

// Derived stores for convenient access
export const activeSessions = derived(
    readingSessionsStore,
    $store => $store.activeSessions
);

export const recentSessions = derived(
    readingSessionsStore,
    $store => $store.sessions.slice(0, 10) // Last 10 sessions
);

export const readingStatistics = derived(
    readingSessionsStore,
    $store => $store.statistics
);

// Helper functions
export function formatSessionDuration(durationMinutes?: number): string {
    if (!durationMinutes) return 'Unknown';

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export function calculateReadingStreak(sessions: ReadingSession[]): number {
    if (sessions.length === 0) return 0;

    // Sort sessions by date (most recent first)
    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
        const sessionDate = new Date(session.started_at);
        sessionDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
            streak++;
        } else if (daysDiff === streak + 1) {
            // Allow for one day gap if today hasn't had a session yet
            streak++;
        } else {
            break;
        }
    }

    return streak;
} 