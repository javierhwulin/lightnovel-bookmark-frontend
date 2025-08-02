export interface Novel {
	id: number;
	title: string;
	author: string;
	description: string;
	status: string;
	genres: string[];
	cover_url: string;
	source_url: string;
	total_chapters: number;
	total_volumes: number;
	content_type: string;
	raw_status: string;
	isFavorite: boolean;
	current_chapter?: number;
	rating?: number;
	user_status?: string;
	personal_notes?: string;
}

export interface Chapter {
	id: number;
	novel_id: number;
	number: number;
	title: string;
	source_url: string;
}

export interface CreateNovelRequest {
	title: string;
	author: string;
	description?: string;
	status?: string;
	genres?: string[];
	cover_url?: string;
	source_url?: string;
	total_chapters?: number;
	total_volumes?: number;
	content_type?: string;
	raw_status?: string;
	rating?: number;
	user_status?: string;
	personal_notes?: string;
}

export interface UpdateNovelRequest {
	title?: string;
	author?: string;
	description?: string;
	status?: string;
	genres?: string[];
	cover_url?: string;
	source_url?: string;
	total_chapters?: number;
	total_volumes?: number;
	content_type?: string;
	raw_status?: string;
	rating?: number;
	user_status?: string;
	personal_notes?: string;
	current_chapter?: number;
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
	cover_url?: string;
	source_url: string;
	total_chapters: number;
	total_volumes: number;
	content_type: string;
	raw_status: string;
} 