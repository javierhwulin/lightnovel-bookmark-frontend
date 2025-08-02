// place files you want to import through the `$lib` alias in this directory.

// Export stores
export {
    favoriteNovels,
    filteredNovels, novels, novelsByGenre, novelsByStatus, novelsError, novelsLoading, novelsStore, searchNovels
} from './stores/novels.js';

// Export types
export type {
    ApiError, Chapter,
    CreateNovelRequest, Novel, ScrapingRequest,
    ScrapingResponse, UpdateNovelRequest
} from './types/novel.js';

// Export API client
export { api } from './api/novels.js';

// Export config
export { config } from './config/env.js';
