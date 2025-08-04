<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	// Icons
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Book from '@lucide/svelte/icons/book';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Edit from '@lucide/svelte/icons/edit';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Heart from '@lucide/svelte/icons/heart';
	import Image from '@lucide/svelte/icons/image';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Save from '@lucide/svelte/icons/save';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	// Stores and types
	import { chapters, chaptersLoading, chaptersStore } from '../../../lib/stores/chapters.js';
	import { enhancedNovels, novelsStore, type EnhancedNovel } from '../../../lib/stores/novels.js';
	import {
		activeSessions,
		formatSessionDuration,
		readingSessionsStore
	} from '../../../lib/stores/reading-sessions.js';
	import {
		USER_STATUSES,
		userPreferencesStore,
		type UserStatus
	} from '../../../lib/stores/user-preferences.js';

	// Interface for the actual reading statistics API response
	interface ReadingStatsResponse {
		total_reading_time_minutes: number;
		average_session_minutes: number;
		total_sessions: number;
		current_streak_days: number;
		chapters_read_today: number;
		favorite_reading_time: string | null;
	}

	// State
	let novel: EnhancedNovel | null = null;
	let loading = true;
	let error: string | null = null;
	let isEditing = false;
	let showDeleteConfirmation = false;
	let novelStats: ReadingStatsResponse | null = null;
	let statsLoading = false;

	// Edit form state
	let editForm = {
		title: '',
		author: '',
		description: '',
		userStatus: '' as UserStatus | '',
		rating: 0,
		personalNotes: '',
		currentChapter: 0
	};

	// Reading session state - derived from store
	$: activeSession = novelId && $activeSessions ? $activeSessions.get(novelId) : undefined;
	$: isReading = activeSession !== undefined;
	$: currentChapter = novel?.currentChapter || 0;

	// Get novel ID from route params
	$: novelId = $page.params.id ? parseInt($page.params.id) : null;

	// Load novel data
	async function loadNovelData(id: number) {
		try {
			loading = true;
			error = null;

			// Load novels store to ensure data is available
			await novelsStore.loadNovels();

			// Get the enhanced novel from the store which includes user preferences
			const enhancedNovelsData = get(enhancedNovels);
			novel = enhancedNovelsData.find((n) => n.id === id) || null;

			// If novel not found in enhanced novels, try to get base novel
			if (!novel) {
				const baseNovel = await novelsStore.getNovel(id);
				// Convert to enhanced novel format for consistency
				novel = baseNovel as EnhancedNovel;
			}

			// Load chapters and reading sessions data
			await chaptersStore.loadChapters(id);

			// Try to load reading sessions (optional, don't fail if not available)
			try {
				await readingSessionsStore.loadSessions({ novel_id: id });
			} catch (sessionError) {
				console.warn('Reading sessions not available:', sessionError);
			}

			// Initialize edit form
			if (novel) {
				editForm = {
					title: novel.title,
					author: novel.author,
					description: novel.description,
					userStatus: (novel.userStatus as UserStatus) || '',
					rating: novel.rating || 0,
					personalNotes: novel.personalNotes || '',
					currentChapter: novel.currentChapter || 0
				};
			}

			// Load novel statistics after main data is loaded
			try {
				await loadNovelStats(id);
			} catch (statsError) {
				console.warn('Reading stats not available:', statsError);
			}
		} catch (err) {
			console.error('Failed to load novel:', err);
			error = err instanceof Error ? err.message : 'Failed to load novel';
		} finally {
			loading = false;
		}
	}

	// Load novel statistics
	async function loadNovelStats(id: number) {
		try {
			statsLoading = true;
			const stats = (await readingSessionsStore.getNovelStatistics(
				id
			)) as unknown as ReadingStatsResponse;

			// Check if we got valid stats object
			if (
				stats &&
				typeof stats === 'object' &&
				!Array.isArray(stats) &&
				typeof stats.total_reading_time_minutes === 'number'
			) {
				novelStats = stats;
			} else {
				novelStats = null;
			}
		} catch (err) {
			console.error('Failed to load novel stats:', err);
			novelStats = null;
		} finally {
			statsLoading = false;
		}
	}

	// Navigation functions
	function goBack() {
		goto('/');
	}

	// Edit mode functions
	function startEditing() {
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		// Reset form to original values
		if (novel) {
			editForm = {
				title: novel.title,
				author: novel.author,
				description: novel.description,
				userStatus: (novel.userStatus as UserStatus) || '',
				rating: novel.rating || 0,
				personalNotes: novel.personalNotes || '',
				currentChapter: novel.currentChapter || 0
			};
		}
	}

	async function saveChanges() {
		if (!novel) return;

		try {
			// Update novel basic info if changed
			if (
				editForm.title !== novel.title ||
				editForm.author !== novel.author ||
				editForm.description !== novel.description
			) {
				await novelsStore.updateNovel(novel.id, {
					title: editForm.title,
					author: editForm.author,
					description: editForm.description
				});
			}

			// Update user preferences
			if (editForm.userStatus && editForm.userStatus !== novel.userStatus) {
				await userPreferencesStore.setUserStatus(novel.id, editForm.userStatus);
			}

			if (editForm.rating !== novel.rating) {
				await userPreferencesStore.setRating(novel.id, editForm.rating || undefined);
			}

			if (editForm.personalNotes !== novel.personalNotes) {
				await userPreferencesStore.setPersonalNotes(novel.id, editForm.personalNotes);
			}

			if (editForm.currentChapter !== novel.currentChapter) {
				await userPreferencesStore.updateProgress(novel.id, editForm.currentChapter);
			}

			// Reload data
			await loadNovelData(novel.id);
			isEditing = false;
		} catch (err) {
			console.error('Failed to save changes:', err);
			error = err instanceof Error ? err.message : 'Failed to save changes';
		}
	}

	// Delete functions
	function confirmDelete() {
		showDeleteConfirmation = true;
	}

	function cancelDelete() {
		showDeleteConfirmation = false;
	}

	async function deleteNovel() {
		if (!novel) return;

		try {
			await novelsStore.deleteNovel(novel.id);
			goto('/');
		} catch (err) {
			console.error('Failed to delete novel:', err);
			error = err instanceof Error ? err.message : 'Failed to delete novel';
			showDeleteConfirmation = false;
		}
	}

	// Utility functions
	function toggleFavorite() {
		if (novel) {
			userPreferencesStore.toggleFavorite(novel.id);
		}
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return 'Invalid Date';
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'Invalid Date';
		}
	}

	function getProgressPercentage(): number {
		if (!novel || !novel.total_chapters || novel.total_chapters === 0) return 0;
		const current = novel.currentChapter || 0;
		return Math.min(100, Math.round((current / novel.total_chapters) * 100));
	}

	// Reading controls
	async function startReading() {
		if (novel) {
			try {
				await readingSessionsStore.startSession(novel.id, novel.currentChapter);
			} catch (err) {
				console.error('Failed to start reading session:', err);
				// Don't show error to user for reading sessions, as it's not critical
			}
		}
	}

	async function pauseReading() {
		if (novel && activeSession) {
			const currentNovel = novel; // Capture the current novel reference
			try {
				await readingSessionsStore.endSession(novel.id, novel.currentChapter, () => {
					// Refresh novel statistics after ending the session
					setTimeout(async () => {
						await loadNovelStats(currentNovel.id);
					}, 500); // Small delay to allow backend processing
				});
			} catch (err) {
				console.error('Failed to end reading session:', err);
			}
		}
	}

	function goToChapter(chapterNumber: number) {
		if (novel) {
			userPreferencesStore.updateProgress(novel.id, chapterNumber);
		}
	}

	onMount(async () => {
		if (browser && novelId && !isNaN(novelId)) {
			await loadNovelData(novelId);
		}
	});
</script>

<svelte:head>
	<title>{novel ? novel.title : 'Loading...'} - Light Novel Bookmarks</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<button
					on:click={goBack}
					class="flex items-center text-gray-600 transition-colors hover:text-gray-900"
				>
					<ArrowLeft class="mr-2 h-5 w-5" />
					Back to Library
				</button>

				{#if novel && !isEditing}
					<div class="flex items-center space-x-2">
						<button
							on:click={startEditing}
							class="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
						>
							<Edit class="mr-2 h-4 w-4" />
							Edit
						</button>
						<button
							on:click={confirmDelete}
							class="flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						</button>
					</div>
				{:else if isEditing}
					<div class="flex items-center space-x-2">
						<button
							on:click={saveChanges}
							class="flex items-center rounded-lg border border-green-600 bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700"
						>
							<Save class="mr-2 h-4 w-4" />
							Save
						</button>
						<button
							on:click={cancelEditing}
							class="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
						>
							<X class="mr-2 h-4 w-4" />
							Cancel
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Error Messages -->
		{#if error}
			<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<X class="mr-3 h-5 w-5 text-red-400" />
					<p class="text-sm text-red-600">{error}</p>
					<button on:click={() => (error = null)} class="ml-auto rounded p-1 hover:bg-red-100">
						<X class="h-4 w-4 text-red-500" />
					</button>
				</div>
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
				<span class="ml-3 text-gray-600">Loading novel details...</span>
			</div>
		{:else if novel}
			<!-- Main Content -->
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- Left Column - Novel Info -->
				<div class="space-y-6 lg:col-span-2">
					<!-- Novel Header -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="flex flex-col gap-6 md:flex-row">
							<!-- Cover Image -->
							<div class="flex-shrink-0">
								<div
									class="relative flex h-64 w-48 items-center justify-center rounded-lg bg-gray-200"
								>
									{#if novel.cover_url}
										<img
											src={novel.cover_url}
											alt={novel.title}
											class="h-full w-full rounded-lg object-cover"
										/>
									{:else}
										<Image class="h-12 w-12 text-gray-400" />
									{/if}

									<!-- Favorite Button -->
									<button
										on:click={toggleFavorite}
										class="absolute top-3 right-3 rounded-full bg-white/80 p-2 transition-colors hover:bg-white"
									>
										<Heart
											class="h-4 w-4 {novel.isFavorite
												? 'fill-red-500 text-red-500'
												: 'text-gray-600'}"
										/>
									</button>
								</div>
							</div>

							<!-- Novel Details -->
							<div class="flex-1">
								{#if isEditing}
									<!-- Edit Mode -->
									<div class="space-y-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
											<input
												type="text"
												bind:value={editForm.title}
												class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
											/>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-gray-700">Author</label>
											<input
												type="text"
												bind:value={editForm.author}
												class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
											/>
										</div>

										<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
											<div>
												<label class="mb-1 block text-sm font-medium text-gray-700">Status</label>
												<select
													bind:value={editForm.userStatus}
													class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
												>
													<option value="">Select Status</option>
													{#each USER_STATUSES as status (status)}
														<option value={status}>{status}</option>
													{/each}
												</select>
											</div>

											<div>
												<label class="mb-1 block text-sm font-medium text-gray-700">Rating</label>
												<select
													bind:value={editForm.rating}
													class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
												>
													<option value={0}>No rating</option>
													<option value={1}>⭐ (1 star)</option>
													<option value={2}>⭐⭐ (2 stars)</option>
													<option value={3}>⭐⭐⭐ (3 stars)</option>
													<option value={4}>⭐⭐⭐⭐ (4 stars)</option>
													<option value={5}>⭐⭐⭐⭐⭐ (5 stars)</option>
												</select>
											</div>
										</div>
									</div>
								{:else}
									<!-- View Mode -->
									<div class="space-y-4">
										<div>
											<h1 class="text-3xl font-bold text-gray-900">{novel.title}</h1>
											<p class="mt-1 text-lg text-gray-600">by {novel.author}</p>
										</div>

										<!-- Status and Rating -->
										<div class="flex items-center space-x-4">
											{#if novel.userStatus}
												<span
													class="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800"
												>
													{novel.userStatus}
												</span>
											{/if}

											{#if novel.rating}
												<div class="flex items-center">
													{#each [1, 2, 3, 4, 5] as starIndex (starIndex)}
														<Star
															class="h-4 w-4 {starIndex <= novel.rating
																? 'fill-current text-yellow-400'
																: 'text-gray-300'}"
														/>
													{/each}
													<span class="ml-2 text-sm text-gray-600">{novel.rating}/5</span>
												</div>
											{/if}
										</div>

										<!-- Publication Status -->
										<div>
											<span
												class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {novel.status ===
												'completed'
													? 'bg-green-100 text-green-800'
													: novel.status === 'ongoing'
														? 'bg-blue-100 text-blue-800'
														: novel.status === 'hiatus'
															? 'bg-yellow-100 text-yellow-800'
															: 'bg-gray-100 text-gray-800'}"
											>
												{novel.status.charAt(0).toUpperCase() + novel.status.slice(1)}
											</span>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Reading Progress -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<h2 class="mb-4 text-xl font-semibold text-gray-900">Reading Progress</h2>

						<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
							<div>
								<h3 class="mb-1 text-sm font-medium text-gray-500">Current Chapter</h3>
								{#if isEditing}
									<input
										type="number"
										bind:value={editForm.currentChapter}
										min="0"
										max={novel.total_chapters}
										class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
									/>
								{:else}
									<p class="text-2xl font-bold text-gray-900">{novel.currentChapter || 0}</p>
								{/if}
							</div>

							<div>
								<h3 class="mb-1 text-sm font-medium text-gray-500">Total Chapters</h3>
								<p class="text-2xl font-bold text-gray-900">{novel.total_chapters}</p>
							</div>

							<div>
								<h3 class="mb-1 text-sm font-medium text-gray-500">Progress</h3>
								<p class="text-2xl font-bold text-gray-900">{getProgressPercentage()}%</p>
							</div>
						</div>

						<!-- Progress Bar -->
						<div class="mt-4">
							<div class="h-2 rounded-full bg-gray-200">
								<div
									class="h-2 rounded-full bg-blue-600 transition-all duration-300"
									style="width: {getProgressPercentage()}%"
								></div>
							</div>
						</div>

						<!-- Reading Controls -->
						{#if !isEditing}
							<div class="mt-4 flex items-center space-x-3">
								{#if isReading}
									<button
										on:click={pauseReading}
										class="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
									>
										<Pause class="mr-2 h-4 w-4" />
										Pause Reading
									</button>
								{:else}
									<button
										on:click={startReading}
										class="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
									>
										<Play class="mr-2 h-4 w-4" />
										Start Reading
									</button>
								{/if}

								{#if novel.source_url}
									<a
										href={novel.source_url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
									>
										<ExternalLink class="mr-2 h-4 w-4" />
										Read Online
									</a>
								{/if}

								{#if activeSession}
									<div
										class="flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"
									>
										<div class="mr-2 h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
										Reading since {new Date(activeSession.started_at).toLocaleTimeString()}
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Description -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<h2 class="mb-4 text-xl font-semibold text-gray-900">Description</h2>
						{#if isEditing}
							<textarea
								bind:value={editForm.description}
								rows="6"
								class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
								placeholder="Enter novel description..."
							></textarea>
						{:else}
							<p class="leading-relaxed text-gray-700">
								{novel.description || 'No description available.'}
							</p>
						{/if}
					</div>

					<!-- Personal Notes -->
					{#if isEditing || novel.personalNotes}
						<div class="rounded-lg border border-gray-200 bg-white p-6">
							<h2 class="mb-4 text-xl font-semibold text-gray-900">Personal Notes</h2>
							{#if isEditing}
								<textarea
									bind:value={editForm.personalNotes}
									rows="4"
									class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
									placeholder="Your thoughts about this novel..."
								></textarea>
							{:else if novel.personalNotes}
								<p class="leading-relaxed text-gray-700">{novel.personalNotes}</p>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Right Column - Sidebar -->
				<div class="space-y-6">
					<!-- Genres -->
					{#if novel.genres && novel.genres.length > 0}
						<div class="rounded-lg border border-gray-200 bg-white p-6">
							<h2 class="mb-3 text-lg font-semibold text-gray-900">Genres</h2>
							<div class="flex flex-wrap gap-2">
								{#each novel.genres as genre (genre)}
									<span
										class="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
									>
										{genre}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Novel Information -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<h2 class="mb-4 text-lg font-semibold text-gray-900">Information</h2>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-500">Added</span>
								<span class="text-sm text-gray-900"
									>{formatDate(novel.userPreference?.created_at)}</span
								>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-500">Last Updated</span>
								<span class="text-sm text-gray-900"
									>{formatDate(novel.userPreference?.updated_at)}</span
								>
							</div>
							{#if novel.dateStarted}
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Started Reading</span>
									<span class="text-sm text-gray-900">{formatDate(novel.dateStarted)}</span>
								</div>
							{/if}
							{#if novel.dateCompleted}
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Completed</span>
									<span class="text-sm text-gray-900">{formatDate(novel.dateCompleted)}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Chapters Preview -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-lg font-semibold text-gray-900">Chapters</h2>
							<a
								href="/novels/{novel.id}/chapters"
								class="text-sm font-medium text-blue-600 hover:text-blue-800"
							>
								Manage Chapters
							</a>
						</div>
						{#if $chaptersLoading}
							<div class="flex items-center justify-center py-4">
								<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
								<span class="ml-2 text-sm text-gray-600">Loading chapters...</span>
							</div>
						{:else if $chapters.length > 0}
							<div class="max-h-64 space-y-2 overflow-y-auto">
								{#each $chapters.slice(0, 5) as chapter (chapter.id)}
									<button
										on:click={() => goToChapter(chapter.number)}
										class="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 {chapter.number ===
										currentChapter
											? 'border-blue-200 bg-blue-50'
											: ''}"
									>
										<div class="min-w-0 flex-1">
											<p class="font-medium text-gray-900">Chapter {chapter.number}</p>
											<p class="truncate text-sm text-gray-600">{chapter.title}</p>
										</div>
										<ChevronRight class="h-4 w-4 flex-shrink-0 text-gray-400" />
									</button>
								{/each}
								{#if $chapters.length > 5}
									<div class="pt-2 text-center">
										<a
											href="/novels/{novel.id}/chapters"
											class="text-sm text-blue-600 hover:text-blue-800"
										>
											View all {$chapters.length} chapters
										</a>
									</div>
								{/if}
							</div>
						{:else}
							<div class="py-4 text-center">
								<p class="mb-2 text-sm text-gray-500">No chapters available</p>
								<a
									href="/novels/{novel.id}/chapters"
									class="text-sm text-blue-600 hover:text-blue-800"
								>
									Add the first chapter
								</a>
							</div>
						{/if}
					</div>

					<!-- Reading Statistics Panel -->
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<h2 class="mb-4 text-lg font-semibold text-gray-900">Reading Statistics</h2>
						{#if statsLoading}
							<div class="flex items-center justify-center py-4">
								<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
								<span class="ml-2 text-sm text-gray-600">Loading stats...</span>
							</div>
						{:else if novelStats && typeof novelStats === 'object' && !Array.isArray(novelStats) && typeof novelStats.total_reading_time_minutes === 'number'}
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Total Reading Time</span>
									<span class="text-sm font-medium text-gray-900">
										{formatSessionDuration(novelStats.total_reading_time_minutes || 0)}
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Total Sessions</span>
									<span class="text-sm font-medium text-gray-900">
										{novelStats.total_sessions || 0}
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Average Session</span>
									<span class="text-sm font-medium text-gray-900">
										{formatSessionDuration(novelStats.average_session_minutes || 0)}
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Current Streak</span>
									<span class="text-sm font-medium text-gray-900">
										{novelStats.current_streak_days || 0} days
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Chapters Today</span>
									<span class="text-sm font-medium text-gray-900">
										{novelStats.chapters_read_today || 0}
									</span>
								</div>
								{#if activeSession}
									<div class="mt-4 rounded-lg bg-green-50 p-3">
										<div class="flex items-center">
											<div class="h-2 w-2 rounded-full bg-green-600"></div>
											<span class="ml-2 text-sm font-medium text-green-800">Currently Reading</span>
										</div>
										<p class="mt-1 text-xs text-green-600">
											Started: {new Date(activeSession.started_at).toLocaleTimeString()}
										</p>
									</div>
								{/if}
							</div>
						{:else}
							<div class="py-4 text-center">
								<p class="text-sm text-gray-500">No reading statistics available yet.</p>
								<p class="mt-1 text-xs text-gray-400">Start reading to track your progress!</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Novel Not Found -->
			<div class="py-12 text-center">
				<Book class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<h3 class="mb-2 text-lg font-medium text-gray-900">Novel Not Found</h3>
				<p class="mb-4 text-gray-600">
					The novel you're looking for doesn't exist or has been removed.
				</p>
				<button
					on:click={goBack}
					class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
				>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Return to Library
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmation}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
				<Trash2 class="h-6 w-6 text-red-600" />
			</div>

			<h3 class="mb-2 text-center text-lg font-medium text-gray-900">Delete Novel</h3>
			<p class="mb-6 text-center text-sm text-gray-600">
				Are you sure you want to delete "{novel?.title}"? This action cannot be undone.
			</p>

			<div class="flex space-x-3">
				<button
					on:click={cancelDelete}
					class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					on:click={deleteNovel}
					class="flex-1 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
