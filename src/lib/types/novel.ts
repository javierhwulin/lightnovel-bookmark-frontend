export interface Novel {
	id: number;
	title: string;
	author: string;
	description: string;
	status: string;
	genres: string[];
	cover_url: string | null;
	source_url: string | null;
	total_chapters: number;
	total_volumes: number;
	content_type: string;
	raw_status: string;
}

export interface Chapter {
	id: number;
	novel_id: number;
	number: number;
	title: string;
	source_url: string;
}

// User preferences types
export interface UserPreference {
	id?: number;
	novel_id: number;
	status?: string;
	is_favorite?: boolean;
	current_chapter?: number;
	rating?: number;
	personal_notes?: string;
	date_started?: string;
	date_completed?: string;
	created_at?: string;
	updated_at?: string;
}

export interface CreateUserPreferenceRequest {
	status?: string;
	is_favorite?: boolean;
	current_chapter?: number;
	rating?: number;
	personal_notes?: string;
	date_started?: string;
	date_completed?: string;
}

export interface UpdateUserPreferenceRequest {
	status?: string;
	is_favorite?: boolean;
	current_chapter?: number;
	rating?: number;
	personal_notes?: string;
	date_started?: string;
	date_completed?: string;
}

// Reading sessions types
export interface ReadingSession {
	id: number;
	novel_id: number;
	chapter_number?: number;
	started_at: string;
	ended_at?: string;
	duration_minutes?: number;
	device_type?: string;
}

export interface CreateReadingSessionRequest {
	chapter_number?: number;
	device_type?: string;
}

export interface UpdateReadingSessionRequest {
	chapter_number?: number;
	duration_minutes?: number;
}

// Reading statistics types
export interface ReadingStatistics {
	total_novels: number;
	total_reading_time_minutes: number;
	novels_completed: number;
	novels_reading: number;
	current_streak_days: number;
	longest_streak_days: number;
	average_rating: number;
	favorite_genres: string[];
	reading_sessions_count: number;
}

export interface NovelReadingStatistics {
	novel_id: number;
	total_reading_time_minutes: number;
	reading_sessions_count: number;
	chapters_read: number;
	progress_percentage: number;
	first_read_date?: string;
	last_read_date?: string;
}

// Enhanced novel type that combines backend data with user data
export interface EnhancedNovel extends Novel {
	userPreference?: UserPreference;
	// Legacy compatibility - derived from userPreference
	userStatus?: string;
	isFavorite?: boolean;
	currentChapter?: number;
	rating?: number;
	personalNotes?: string;
	dateStarted?: string;
	dateCompleted?: string;
}

export interface CreateNovelRequest {
	title: string;
	author: string;
	description?: string;
	status?: string;
	genres?: string[];
	cover_url?: string | null;
	source_url?: string | null;
	total_chapters?: number;
	total_volumes?: number;
	content_type?: string;
	raw_status?: string;
}

export interface UpdateNovelRequest {
	title?: string;
	author?: string;
	description?: string;
	status?: string;
	genres?: string[];
	cover_url?: string | null;
	source_url?: string | null;
	total_chapters?: number;
	total_volumes?: number;
	content_type?: string;
	raw_status?: string;
}

export interface CreateChapterRequest {
	number: number;
	title: string;
	source_url: string;
}

export interface UpdateChapterRequest {
	number?: number;
	title?: string;
	source_url?: string;
}

export interface ApiError {
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}

export interface ScrapingRequest {
	url: string;
}

export interface ScrapingResponse {
	title: string;
	author: string;
	description: string;
	status: string;
	genres: string[];
	cover_url: string | null;
	source_url: string;
	total_chapters: number;
	total_volumes: number;
	content_type: string;
	raw_status: string;
}

export interface BackgroundImportResponse {
	task_id: string;
}

export interface HealthResponse {
	status: string;
}

export interface ApiInfoResponse {
	title: string;
	version: string;
	description: string;
} 