import { config } from '../config/env.js';
import type {
	ApiError,
	Chapter,
	CreateNovelRequest,
	Novel,
	ScrapingRequest,
	ScrapingResponse,
	UpdateNovelRequest
} from '../types/novel.js';

// Configure the base API URL from environment
const API_BASE_URL = config.API_BASE_URL;

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

	async createChapter(novelId: number, chapter: Omit<Chapter, 'id' | 'novel_id'>): Promise<Chapter> {
		return this.request<Chapter>(`/novels/${novelId}/chapters`, {
			method: 'POST',
			body: JSON.stringify(chapter),
		});
	}

	async updateChapter(novelId: number, chapterId: number, updates: Partial<Omit<Chapter, 'id' | 'novel_id'>>): Promise<Chapter> {
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

	async importNovelBackground(request: ScrapingRequest): Promise<{ task_id: string }> {
		return this.request<{ task_id: string }>('/scraper/import-background', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	// Health check
	async healthCheck(): Promise<{ status: string }> {
		return this.request<{ status: string }>('/health');
	}
}

// Export singleton instance
export const api = new ApiClient(); 