import { config } from '../config/env.js';
import type {
	ApiError,
	ApiInfoResponse,
	BackgroundImportResponse,
	Chapter,
	CreateChapterRequest,
	CreateNovelRequest,
	CreateReadingSessionRequest,
	CreateUserPreferenceRequest,
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
} from '../types/novel.js';

// Configure the base API URL from environment
const API_BASE_URL = config.API_BASE_URL;

// Backend request format - maps frontend field names to backend field names
interface BackendUserPreferenceRequest {
	user_status?: string;
	is_favorite?: boolean;
	current_chapter?: number;
	rating?: number;
	personal_notes?: string;
	date_started?: string;
	date_completed?: string;
}

// Backend response format
interface BackendUserPreferenceResponse {
	id: number;
	novel_id: number;
	user_status?: string;
	is_favorite?: boolean;
	current_chapter?: number;
	rating?: number;
	personal_notes?: string;
	date_started?: string;
	date_completed?: string;
	created_at: string;
	updated_at: string;
}

// Status value mapping between frontend and backend
const FRONTEND_TO_BACKEND_STATUS: Record<string, string> = {
	'Reading': 'reading',
	'Wishlist': 'plan_to_read',
	'Completed': 'completed',
	'On Hold': 'on_hold',
	'Dropped': 'dropped'
};

const BACKEND_TO_FRONTEND_STATUS: Record<string, string> = {
	'reading': 'Reading',
	'plan_to_read': 'Wishlist',
	'completed': 'Completed',
	'on_hold': 'On Hold',
	'dropped': 'Dropped'
};

class ApiClient {
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`;

		const config: RequestInit = {
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
			...options,
		};

		try {
			const response = await fetch(url, config);

			if (!response.ok) {
				const errorData: ApiError = await response.json();
				throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			// Handle empty responses (e.g., DELETE requests)
			if (response.status === 204) {
				return {} as T;
			}

			return await response.json();
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('An unexpected error occurred');
		}
	}

	// System endpoints
	async getApiInfo(): Promise<ApiInfoResponse> {
		// Backend serves this at the root path, not under /api
		const baseUrl = API_BASE_URL.replace('/api', '');
		const response = await fetch(`${baseUrl}/api`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	async healthCheck(): Promise<HealthResponse> {
		// Backend serves this at the root path, not under /api
		const baseUrl = API_BASE_URL.replace('/api', '');
		const response = await fetch(`${baseUrl}/health`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	// Novel endpoints
	async getNovels(): Promise<Novel[]> {
		return this.request<Novel[]>('/novels');
	}

	async getNovel(id: number): Promise<Novel> {
		return this.request<Novel>(`/novels/${id}`);
	}

	async createNovel(novel: CreateNovelRequest): Promise<Novel> {
		return this.request<Novel>('/novels', {
			method: 'POST',
			body: JSON.stringify(novel),
		});
	}

	async updateNovel(id: number, updates: UpdateNovelRequest): Promise<Novel> {
		return this.request<Novel>(`/novels/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(updates),
		});
	}

	async deleteNovel(id: number): Promise<void> {
		await this.request<void>(`/novels/${id}`, {
			method: 'DELETE',
		});
	}

	// Chapter endpoints
	async getChapters(novelId: number): Promise<Chapter[]> {
		return this.request<Chapter[]>(`/novels/${novelId}/chapters`);
	}

	async getChapter(novelId: number, chapterId: number): Promise<Chapter> {
		return this.request<Chapter>(`/novels/${novelId}/chapters/${chapterId}`);
	}

	async createChapter(novelId: number, chapter: CreateChapterRequest): Promise<Chapter> {
		return this.request<Chapter>(`/novels/${novelId}/chapters`, {
			method: 'POST',
			body: JSON.stringify(chapter),
		});
	}

	async updateChapter(novelId: number, chapterId: number, updates: UpdateChapterRequest): Promise<Chapter> {
		return this.request<Chapter>(`/novels/${novelId}/chapters/${chapterId}`, {
			method: 'PATCH',
			body: JSON.stringify(updates),
		});
	}

	async deleteChapter(novelId: number, chapterId: number): Promise<void> {
		await this.request<void>(`/novels/${novelId}/chapters/${chapterId}`, {
			method: 'DELETE',
		});
	}

	// Helper methods for status conversion
	private mapStatusToBackend(frontendStatus?: string): string | undefined {
		if (!frontendStatus) return undefined;
		return FRONTEND_TO_BACKEND_STATUS[frontendStatus] || frontendStatus;
	}

	private mapStatusToFrontend(backendStatus?: string): string | undefined {
		if (!backendStatus) return undefined;
		return BACKEND_TO_FRONTEND_STATUS[backendStatus] || backendStatus;
	}

	private mapUserPreferenceFromBackend(backendPref: BackendUserPreferenceResponse): UserPreference {
		return {
			...backendPref,
			status: this.mapStatusToFrontend(backendPref.user_status)
		};
	}

	// User preferences endpoints (with localStorage fallback until backend is ready)
	async getUserPreference(novelId: number): Promise<UserPreference | null> {
		try {
			const backendPref = await this.request<BackendUserPreferenceResponse>(`/user-preferences/${novelId}`);
			return this.mapUserPreferenceFromBackend(backendPref);
		} catch (error) {
			// Fallback to localStorage if backend doesn't have user preferences yet
			if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
				return this.getLocalUserPreference(novelId);
			}
			throw error;
		}
	}

	async getUserPreferences(): Promise<UserPreference[]> {
		try {
			const backendPrefs = await this.request<BackendUserPreferenceResponse[]>('/user-preferences');
			return backendPrefs.map(pref => this.mapUserPreferenceFromBackend(pref));
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			return this.getAllLocalUserPreferences();
		}
	}

	async createUserPreference(novelId: number, preference: CreateUserPreferenceRequest): Promise<UserPreference> {
		try {
			// Map frontend field names to backend field names, filtering undefined values
			const backendPreference: BackendUserPreferenceRequest = {};
			if (preference.status !== undefined) backendPreference.user_status = this.mapStatusToBackend(preference.status);
			if (preference.is_favorite !== undefined) backendPreference.is_favorite = preference.is_favorite;
			if (preference.current_chapter !== undefined) backendPreference.current_chapter = preference.current_chapter;
			if (preference.rating !== undefined) backendPreference.rating = preference.rating;
			if (preference.personal_notes !== undefined) backendPreference.personal_notes = preference.personal_notes;
			if (preference.date_started !== undefined) backendPreference.date_started = preference.date_started;
			if (preference.date_completed !== undefined) backendPreference.date_completed = preference.date_completed;

			const backendResult = await this.request<BackendUserPreferenceResponse>(`/user-preferences/${novelId}`, {
				method: 'POST',
				body: JSON.stringify(backendPreference),
			});
			return this.mapUserPreferenceFromBackend(backendResult);
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			return this.saveLocalUserPreference(novelId, preference);
		}
	}

	async updateUserPreference(novelId: number, updates: UpdateUserPreferenceRequest): Promise<UserPreference> {
		try {
			// Map frontend field names to backend field names, filtering undefined values
			const backendUpdates: BackendUserPreferenceRequest = {};
			if (updates.status !== undefined) backendUpdates.user_status = this.mapStatusToBackend(updates.status);
			if (updates.is_favorite !== undefined) backendUpdates.is_favorite = updates.is_favorite;
			if (updates.current_chapter !== undefined) backendUpdates.current_chapter = updates.current_chapter;
			if (updates.rating !== undefined) backendUpdates.rating = updates.rating;
			if (updates.personal_notes !== undefined) backendUpdates.personal_notes = updates.personal_notes;
			if (updates.date_started !== undefined) backendUpdates.date_started = updates.date_started;
			if (updates.date_completed !== undefined) backendUpdates.date_completed = updates.date_completed;

			const backendResult = await this.request<BackendUserPreferenceResponse>(`/user-preferences/${novelId}`, {
				method: 'PATCH',
				body: JSON.stringify(backendUpdates),
			});
			return this.mapUserPreferenceFromBackend(backendResult);
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			return this.updateLocalUserPreference(novelId, updates);
		}
	}

	async deleteUserPreference(novelId: number): Promise<void> {
		try {
			await this.request<void>(`/user-preferences/${novelId}`, {
				method: 'DELETE',
			});
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			this.deleteLocalUserPreference(novelId);
		}
	}

	// Quick preference updates
	async updateUserStatus(novelId: number, status: string): Promise<UserPreference> {
		try {
			const backendStatus = this.mapStatusToBackend(status);
			const backendResult = await this.request<BackendUserPreferenceResponse>(`/user-preferences/${novelId}/status`, {
				method: 'PATCH',
				body: JSON.stringify({ user_status: backendStatus }),
			});
			return this.mapUserPreferenceFromBackend(backendResult);
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			return this.updateLocalUserPreference(novelId, { status });
		}
	}

	async updateReadingProgress(novelId: number, currentChapter: number): Promise<UserPreference> {
		try {
			const backendResult = await this.request<BackendUserPreferenceResponse>(`/user-preferences/${novelId}/progress`, {
				method: 'PATCH',
				body: JSON.stringify({ current_chapter: currentChapter }),
			});
			return this.mapUserPreferenceFromBackend(backendResult);
		} catch {
			// Fallback to localStorage if backend doesn't have user preferences yet
			console.warn('Backend user preferences not available, using localStorage fallback');
			return this.updateLocalUserPreference(novelId, { current_chapter: currentChapter });
		}
	}

	// Reading sessions endpoints
	async startReadingSession(novelId: number, session: CreateReadingSessionRequest): Promise<ReadingSession> {
		return this.request<ReadingSession>(`/reading-sessions/${novelId}/start`, {
			method: 'POST',
			body: JSON.stringify(session),
		});
	}

	async endReadingSession(sessionId: number, updates?: UpdateReadingSessionRequest): Promise<ReadingSession> {
		return this.request<ReadingSession>(`/reading-sessions/${sessionId}/end`, {
			method: 'PATCH',
			body: JSON.stringify(updates || {}),
		});
	}

	async getReadingSessions(filters?: { novel_id?: number; limit?: number; offset?: number }): Promise<ReadingSession[]> {
		const queryParams = new URLSearchParams();
		if (filters?.novel_id) queryParams.append('novel_id', filters.novel_id.toString());
		if (filters?.limit) queryParams.append('limit', filters.limit.toString());
		if (filters?.offset) queryParams.append('offset', filters.offset.toString());

		const query = queryParams.toString();
		return this.request<ReadingSession[]>(`/reading-sessions${query ? `?${query}` : ''}`);
	}

	// Analytics endpoints
	async getReadingStatistics(): Promise<ReadingStatistics> {
		return this.request<ReadingStatistics>('/reading-statistics');
	}

	async getNovelReadingStatistics(novelId: number): Promise<NovelReadingStatistics> {
		return this.request<NovelReadingStatistics>(`/reading-statistics?novel_id=${novelId}`);
	}

	// Scraper endpoints
	async previewNovel(request: ScrapingRequest): Promise<ScrapingResponse> {
		return this.request<ScrapingResponse>('/scraper/preview', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async importNovel(request: ScrapingRequest): Promise<Novel> {
		return this.request<Novel>('/scraper/import', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async updateNovelFromSource(id: number): Promise<Novel> {
		return this.request<Novel>(`/scraper/update/${id}`, {
			method: 'POST',
		});
	}

	async importNovelBackground(request: ScrapingRequest): Promise<BackgroundImportResponse> {
		return this.request<BackgroundImportResponse>('/scraper/import-background', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	// LocalStorage fallback methods
	private getLocalUserPreferences(): Record<string, UserPreference> {
		if (typeof window === 'undefined') return {};
		try {
			const stored = localStorage.getItem('lightnovel-user-preferences');
			return stored ? JSON.parse(stored) : {};
		} catch {
			return {};
		}
	}

	private saveLocalUserPreferences(preferences: Record<string, UserPreference>): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem('lightnovel-user-preferences', JSON.stringify(preferences));
		} catch (error) {
			console.warn('Failed to save to localStorage:', error);
		}
	}

	private getLocalUserPreference(novelId: number): UserPreference | null {
		const prefs = this.getLocalUserPreferences();
		return prefs[novelId.toString()] || null;
	}

	private getAllLocalUserPreferences(): UserPreference[] {
		const prefs = this.getLocalUserPreferences();
		return Object.values(prefs);
	}

	private saveLocalUserPreference(novelId: number, preference: CreateUserPreferenceRequest): UserPreference {
		const prefs = this.getLocalUserPreferences();
		const newPref: UserPreference = {
			id: Date.now(), // Temporary ID
			novel_id: novelId,
			...preference,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		prefs[novelId.toString()] = newPref;
		this.saveLocalUserPreferences(prefs);
		return newPref;
	}

	private updateLocalUserPreference(novelId: number, updates: UpdateUserPreferenceRequest): UserPreference {
		const prefs = this.getLocalUserPreferences();
		const existing = prefs[novelId.toString()] || {
			id: Date.now(),
			novel_id: novelId,
			created_at: new Date().toISOString()
		};

		const updated: UserPreference = {
			...existing,
			...updates,
			updated_at: new Date().toISOString()
		};

		prefs[novelId.toString()] = updated;
		this.saveLocalUserPreferences(prefs);
		return updated;
	}

	private deleteLocalUserPreference(novelId: number): void {
		const prefs = this.getLocalUserPreferences();
		delete prefs[novelId.toString()];
		this.saveLocalUserPreferences(prefs);
	}
}

// Export singleton instance
export const api = new ApiClient(); 