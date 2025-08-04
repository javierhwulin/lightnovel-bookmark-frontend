// Re-export your most used types and utilities.

// API
export { api } from './api/novels.js';

// Configuration
export { config, validateConfig } from './config/env.js';

// Types
export type {
    ApiError,
    ApiInfoResponse,
    BackgroundImportResponse,
    Chapter,
    CreateChapterRequest,
    CreateNovelRequest,
    CreateReadingSessionRequest,
    CreateUserPreferenceRequest,
    EnhancedNovel,
    HealthResponse,
    Novel,
    NovelReadingStatistics,
    ReadingSession,
    ReadingStatistics,
    ScrapingRequest,
    ScrapingResponse,
    UpdateChapterRequest,
    UpdateNovelRequest,
    UpdateReadingSessionRequest,
    UpdateUserPreferenceRequest,
    UserPreference
} from './types/novel.js';

// Novel stores
export {
    availableGenres,
    currentlyReading,
    enhancedNovels,
    favoriteNovels,
    filteredNovels,
    novelsError,
    novelsLoading,
    novelsStore
} from './stores/novels.js';

// Chapter stores
export {
    chapterByNumber,
    chapters,
    chaptersCount,
    chaptersError,
    chaptersLoading,
    chaptersStore,
    currentNovelId,
    latestChapter
} from './stores/chapters.js';

// User preferences
export {
    availableUserStatuses,
    favoriteNovelIds,
    getUserNovelData,
    getUserNovelDataDerived,
    novelsByUserStatus,
    readingStats,
    USER_STATUSES,
    userNovelsData,
    userPreferencesStore,
    type UserStatus
} from './stores/user-preferences.js';

// Reading sessions
export {
    activeSessions,
    calculateReadingStreak,
    formatSessionDuration,
    readingSessionsStore,
    readingStatistics,
    recentSessions
} from './stores/reading-sessions.js';

// Utilities
export { cn } from './utils.js';
