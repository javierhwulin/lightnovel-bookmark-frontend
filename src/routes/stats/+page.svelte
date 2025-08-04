<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	// Icons
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import Book from '@lucide/svelte/icons/book';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Heart from '@lucide/svelte/icons/heart';
	import Star from '@lucide/svelte/icons/star';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	// Stores and types
	import { config } from '../../lib/config/env.js';
	import { enhancedNovels, novelsStore } from '../../lib/stores/novels.js';
	import { readingStats, userPreferencesStore } from '../../lib/stores/user-preferences.js';

	// State
	let loading = true;
	let error: string | null = null;

	// Computed statistics
	$: novels = $enhancedNovels;
	$: basicStats = $readingStats;

	// Advanced statistics calculations
	$: advancedStats = (() => {
		if (!novels.length) return null;

		// Total chapters read across all novels
		const totalChaptersRead = novels.reduce((sum, novel) => {
			return sum + (novel.currentChapter || 0);
		}, 0);

		// Total chapters available
		const totalChaptersAvailable = novels.reduce((sum, novel) => {
			return sum + (novel.total_chapters || 0);
		}, 0);

		// Average progress percentage
		const novelsWithProgress = novels.filter((n) => n.total_chapters && n.total_chapters > 0);
		const avgProgress =
			novelsWithProgress.length > 0
				? novelsWithProgress.reduce((sum, novel) => {
						const progress = ((novel.currentChapter || 0) / novel.total_chapters) * 100;
						return sum + Math.min(100, progress);
					}, 0) / novelsWithProgress.length
				: 0;

		// Rating statistics
		const ratedNovels = novels.filter((n) => n.rating && n.rating > 0);
		const avgRating =
			ratedNovels.length > 0
				? ratedNovels.reduce((sum, novel) => sum + (novel.rating || 0), 0) / ratedNovels.length
				: 0;

		// Rating distribution
		const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
			rating,
			count: ratedNovels.filter((n) => n.rating === rating).length
		}));

		// Genre statistics
		const genreCount: Record<string, number> = {};
		novels.forEach((novel) => {
			novel.genres.forEach((genre) => {
				genreCount[genre] = (genreCount[genre] || 0) + 1;
			});
		});
		const sortedGenres = Object.entries(genreCount)
			.sort(([, a], [, b]) => (b as number) - (a as number))
			.slice(0, 10);

		// Author statistics
		const authorCount: Record<string, number> = {};
		novels.forEach((novel) => {
			authorCount[novel.author] = (authorCount[novel.author] || 0) + 1;
		});
		const sortedAuthors = Object.entries(authorCount)
			.sort(([, a], [, b]) => (b as number) - (a as number))
			.slice(0, 10);

		// Reading velocity (chapters per novel for completed ones)
		const completedNovels = novels.filter((n) => n.userStatus === 'Completed');
		const avgChaptersPerCompleted =
			completedNovels.length > 0
				? completedNovels.reduce((sum, novel) => sum + (novel.total_chapters || 0), 0) /
					completedNovels.length
				: 0;

		// Novel status distribution
		const statusDistribution: Record<string, number> = novels.reduce(
			(acc, novel) => {
				const status = novel.status || 'unknown';
				acc[status] = (acc[status] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return {
			totalChaptersRead,
			totalChaptersAvailable,
			avgProgress: Math.round(avgProgress * 10) / 10,
			avgRating: Math.round(avgRating * 10) / 10,
			ratingDistribution,
			topGenres: sortedGenres,
			topAuthors: sortedAuthors,
			avgChaptersPerCompleted: Math.round(avgChaptersPerCompleted),
			statusDistribution,
			completionRate:
				novels.length > 0 ? Math.round((basicStats.completed / novels.length) * 100) : 0
		};
	})();

	// Time-based statistics
	$: timeStats = (() => {
		if (!novels.length) return null;

		const now = new Date();
		const thisMonth = now.getMonth();
		const thisYear = now.getFullYear();

		// Novels added this month
		const addedThisMonth = novels.filter((novel) => {
			if (!novel.userPreference?.created_at) return false;
			const createdDate = new Date(novel.userPreference.created_at);
			return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
		}).length;

		// Novels completed this month
		const completedThisMonth = novels.filter((novel) => {
			if (!novel.dateCompleted) return false;
			const completedDate = new Date(novel.dateCompleted);
			return completedDate.getMonth() === thisMonth && completedDate.getFullYear() === thisYear;
		}).length;

		// Reading streak (simplified - based on recent updates)
		const recentActivity = novels.filter((novel) => {
			if (!novel.userPreference?.updated_at) return false;
			const updatedDate = new Date(novel.userPreference.updated_at);
			const daysDiff = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
			return daysDiff <= 7; // Active in last week
		}).length;

		return {
			addedThisMonth,
			completedThisMonth,
			recentActivity
		};
	})();

	// Load data on mount
	onMount(async () => {
		if (browser) {
			try {
				loading = true;
				error = null;
				await novelsStore.loadNovels();
				await userPreferencesStore.loadPreferences();
			} catch (err) {
				console.error('Failed to load stats data:', err);
				error = err instanceof Error ? err.message : 'Failed to load data';
			} finally {
				loading = false;
			}
		}
	});

	function goBack() {
		goto('/');
	}
</script>

<svelte:head>
	<title>Reading Statistics - {config.APP_TITLE}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-6">
				<div>
					<button
						on:click={goBack}
						class="mb-2 flex items-center text-gray-600 transition-colors hover:text-gray-900"
					>
						<ArrowLeft class="mr-2 h-5 w-5" />
						Back to Library
					</button>
					<h1 class="text-3xl font-bold text-gray-900">Reading Statistics</h1>
					<p class="mt-1 text-gray-600">Your reading journey insights and analytics</p>
				</div>
				<div class="flex items-center">
					<BarChart class="h-8 w-8 text-gray-400" />
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Error Message -->
		{#if error}
			<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-red-600">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
				<span class="ml-3 text-gray-600">Loading statistics...</span>
			</div>
		{:else if novels.length === 0}
			<!-- No Data State -->
			<div class="py-12 text-center">
				<Book class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<h3 class="mb-2 text-lg font-medium text-gray-900">No Reading Data Available</h3>
				<p class="mb-4 text-gray-600">
					Add some novels to your library to see your reading statistics.
				</p>
				<button
					on:click={goBack}
					class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
				>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Go to Library
				</button>
			</div>
		{:else}
			<!-- Statistics Content -->
			<div class="space-y-8">
				<!-- Overview Stats -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<Book class="h-8 w-8 text-blue-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Total Novels</p>
								<p class="text-2xl font-bold text-gray-900">{basicStats.total}</p>
							</div>
						</div>
					</div>

					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<BookOpen class="h-8 w-8 text-green-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Currently Reading</p>
								<p class="text-2xl font-bold text-gray-900">{basicStats.reading}</p>
							</div>
						</div>
					</div>

					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<Star class="h-8 w-8 text-yellow-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Completed</p>
								<p class="text-2xl font-bold text-gray-900">{basicStats.completed}</p>
							</div>
						</div>
					</div>

					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<Heart class="h-8 w-8 text-red-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-500">Favorites</p>
								<p class="text-2xl font-bold text-gray-900">{basicStats.favorites}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Progress & Rating Stats -->
				{#if advancedStats}
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<!-- Reading Progress -->
						<div class="rounded-lg border border-gray-200 bg-white p-6">
							<h2 class="mb-4 text-xl font-semibold text-gray-900">Reading Progress</h2>
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Total Chapters Read</span>
									<span class="text-lg font-semibold text-gray-900"
										>{advancedStats.totalChaptersRead.toLocaleString()}</span
									>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Total Chapters Available</span>
									<span class="text-lg font-semibold text-gray-900"
										>{advancedStats.totalChaptersAvailable.toLocaleString()}</span
									>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Average Progress</span>
									<span class="text-lg font-semibold text-gray-900"
										>{advancedStats.avgProgress}%</span
									>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-500">Completion Rate</span>
									<span class="text-lg font-semibold text-gray-900"
										>{advancedStats.completionRate}%</span
									>
								</div>
								{#if advancedStats.avgChaptersPerCompleted > 0}
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-500">Avg Chapters/Completed</span>
										<span class="text-lg font-semibold text-gray-900"
											>{advancedStats.avgChaptersPerCompleted}</span
										>
									</div>
								{/if}
							</div>
						</div>

						<!-- Rating Statistics -->
						<div class="rounded-lg border border-gray-200 bg-white p-6">
							<h2 class="mb-4 text-xl font-semibold text-gray-900">Rating Overview</h2>
							<div class="space-y-4">
								{#if advancedStats.avgRating > 0}
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-500">Average Rating</span>
										<div class="flex items-center">
											<Star class="mr-1 h-4 w-4 fill-current text-yellow-400" />
											<span class="text-lg font-semibold text-gray-900"
												>{advancedStats.avgRating}/5</span
											>
										</div>
									</div>
									<div class="space-y-2">
										{#each [...advancedStats.ratingDistribution].reverse() as { rating, count } (rating)}
											<div class="flex items-center justify-between">
												<div class="flex items-center">
													<span class="w-8 text-sm text-gray-500">{rating}★</span>
													<div class="ml-2 h-2 w-32 rounded-full bg-gray-200">
														<div
															class="h-2 rounded-full bg-yellow-400"
															style="width: {advancedStats.ratingDistribution.length > 0
																? (count /
																		Math.max(
																			...advancedStats.ratingDistribution.map((r) => r.count)
																		)) *
																	100
																: 0}%"
														></div>
													</div>
												</div>
												<span class="text-sm text-gray-900">{count}</span>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-gray-500">No ratings yet. Start rating your novels!</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Monthly Activity -->
				{#if timeStats}
					<div class="rounded-lg border border-gray-200 bg-white p-6">
						<h2 class="mb-4 text-xl font-semibold text-gray-900">This Month's Activity</h2>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<Calendar class="h-6 w-6 text-blue-600" />
								</div>
								<div class="ml-3">
									<p class="text-sm text-gray-500">Novels Added</p>
									<p class="text-xl font-bold text-gray-900">{timeStats.addedThisMonth}</p>
								</div>
							</div>
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<Star class="h-6 w-6 text-green-600" />
								</div>
								<div class="ml-3">
									<p class="text-sm text-gray-500">Novels Completed</p>
									<p class="text-xl font-bold text-gray-900">{timeStats.completedThisMonth}</p>
								</div>
							</div>
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<TrendingUp class="h-6 w-6 text-purple-600" />
								</div>
								<div class="ml-3">
									<p class="text-sm text-gray-500">Recent Activity</p>
									<p class="text-xl font-bold text-gray-900">{timeStats.recentActivity}</p>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Reading Status Breakdown -->
				<div class="rounded-lg border border-gray-200 bg-white p-6">
					<h2 class="mb-4 text-xl font-semibold text-gray-900">Reading Status Breakdown</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
						<div class="text-center">
							<div class="text-2xl font-bold text-green-600">{basicStats.reading}</div>
							<div class="text-sm text-gray-500">Reading</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-blue-600">{basicStats.completed}</div>
							<div class="text-sm text-gray-500">Completed</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-yellow-600">{basicStats.onHold}</div>
							<div class="text-sm text-gray-500">On Hold</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-gray-600">{basicStats.wishlist}</div>
							<div class="text-sm text-gray-500">Wishlist</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-red-600">{basicStats.dropped}</div>
							<div class="text-sm text-gray-500">Dropped</div>
						</div>
					</div>
				</div>

				<!-- Top Genres & Authors -->
				{#if advancedStats && (advancedStats.topGenres.length > 0 || advancedStats.topAuthors.length > 0)}
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<!-- Top Genres -->
						{#if advancedStats.topGenres.length > 0}
							<div class="rounded-lg border border-gray-200 bg-white p-6">
								<h2 class="mb-4 text-xl font-semibold text-gray-900">Top Genres</h2>
								<div class="space-y-3">
									{#each advancedStats.topGenres as [genre, count] (genre)}
										<div class="flex items-center justify-between">
											<span class="text-sm text-gray-700">{genre}</span>
											<div class="flex items-center">
												<div class="mr-2 h-2 w-20 rounded-full bg-gray-200">
													<div
														class="h-2 rounded-full bg-blue-600"
														style="width: {(count / advancedStats.topGenres[0][1]) * 100}%"
													></div>
												</div>
												<span class="text-sm font-medium text-gray-900">{count}</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Top Authors -->
						{#if advancedStats.topAuthors.length > 0}
							<div class="rounded-lg border border-gray-200 bg-white p-6">
								<h2 class="mb-4 text-xl font-semibold text-gray-900">Top Authors</h2>
								<div class="space-y-3">
									{#each advancedStats.topAuthors as [author, count] (author)}
										<div class="flex items-center justify-between">
											<span class="truncate text-sm text-gray-700">{author}</span>
											<div class="flex items-center">
												<div class="mr-2 h-2 w-20 rounded-full bg-gray-200">
													<div
														class="h-2 rounded-full bg-green-600"
														style="width: {(count / advancedStats.topAuthors[0][1]) * 100}%"
													></div>
												</div>
												<span class="text-sm font-medium text-gray-900">{count}</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
