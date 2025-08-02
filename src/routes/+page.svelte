<script lang="ts">
	import Book from '@lucide/svelte/icons/book';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Filter from '@lucide/svelte/icons/filter';
	import Heart from '@lucide/svelte/icons/heart';
	import Image from '@lucide/svelte/icons/image';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import X from '@lucide/svelte/icons/x';
	import { onMount } from 'svelte';
	// Import stores and types
	import { config } from '../lib/config/env.js';
	import {
		favoriteNovels,
		filteredNovels,
		novels,
		novelsError,
		novelsLoading,
		novelsStore
	} from '../lib/stores/novels.js';
	import type { Novel } from '../lib/types/novel.js';

	// State variables
	let activeTab = 'library';
	let searchQuery = '';
	let statusFilter = 'All Status';
	let genreFilter = 'All Genres';
	let showStatusDropdown = false;
	let showGenreDropdown = false;
	let showAddModal = false;

	// Modal form state
	let modalForm = {
		novelUpdatesUrl: '',
		title: '',
		author: '',
		description: '',
		source_url: '',
		cover_url: '',
		user_status: 'Wishlist',
		novel_status: 'Ongoing',
		rating: 'No rating',
		genres: [] as string[],
		personal_notes: ''
	};

	let customGenre = '';
	let scrapingLoading = false;
	let scrapingError = '';

	const statusOptions = ['All Status', 'Reading', 'Completed', 'Dropped', 'Wishlist'];
	const userStatusOptions = ['Reading', 'Completed', 'Dropped', 'Wishlist'];
	const novelStatusOptions = ['Ongoing', 'Completed', 'Hiatus', 'Cancelled'];
	const ratingOptions = ['No rating', '1', '2', '3', '4', '5'];

	const predefinedGenres = [
		'Isekai',
		'Fantasy',
		'Romance',
		'Action',
		'Adventure',
		'Comedy',
		'Drama',
		'Slice of Life',
		'Harem',
		'School Life',
		'Magic',
		'System',
		'Cultivation',
		'Modern',
		'Historical',
		'Sci-Fi',
		'Mystery',
		'Horror',
		'Dark'
	];

	// Reactive statements
	$: displayedNovels = $filteredNovels(searchQuery, statusFilter, genreFilter);

	// Get unique genres from all novels
	$: allGenres = [...new Set($novels.flatMap((novel) => novel.genres))].sort();
	$: genreOptions = ['All Genres', ...allGenres];

	// Update tabs count based on current novels
	$: tabs = [
		{ id: 'library', label: 'Library', count: displayedNovels.length },
		{ id: 'favorites', label: 'Favorites', count: $favoriteNovels.length },
		{
			id: 'wishlist',
			label: 'Wishlist',
			count: displayedNovels.filter((n) => n.user_status === 'Wishlist').length
		}
	];

	// Filter novels based on active tab
	$: tabFilteredNovels = (() => {
		switch (activeTab) {
			case 'favorites':
				return $favoriteNovels.filter((novel) => {
					// Apply search and filters to favorites
					let filtered = [novel];
					if (searchQuery.trim()) {
						const searchTerm = searchQuery.toLowerCase();
						filtered = filtered.filter(
							(n) =>
								n.title.toLowerCase().includes(searchTerm) ||
								n.author.toLowerCase().includes(searchTerm) ||
								n.description.toLowerCase().includes(searchTerm)
						);
					}
					if (statusFilter !== 'All Status') {
						filtered = filtered.filter((n) => n.user_status === statusFilter);
					}
					if (genreFilter !== 'All Genres') {
						filtered = filtered.filter((n) => n.genres.includes(genreFilter));
					}
					return filtered.length > 0;
				});
			case 'wishlist':
				return displayedNovels.filter((n) => n.user_status === 'Wishlist');
			default:
				return displayedNovels;
		}
	})();

	// Load novels on component mount
	onMount(async () => {
		try {
			await novelsStore.loadNovels();
		} catch (error) {
			console.error('Failed to load novels:', error);
		}
	});

	function toggleFavorite(novelId: number) {
		novelsStore.toggleFavorite(novelId);
	}

	function formatProgress(novel: Novel): string {
		if (novel.content_type === 'volumes') {
			return `Vol ${novel.current_chapter || '?'}, Ch ?`;
		} else {
			return `Vol ?, Ch ${novel.current_chapter || '?'}`;
		}
	}

	// Close dropdowns when clicking outside
	function closeDropdowns() {
		showStatusDropdown = false;
		showGenreDropdown = false;
	}

	// Modal functions
	function openAddModal() {
		showAddModal = true;
		// Reset form
		modalForm = {
			novelUpdatesUrl: '',
			title: '',
			author: '',
			description: '',
			source_url: '',
			cover_url: '',
			user_status: 'Wishlist',
			novel_status: 'Ongoing',
			rating: 'No rating',
			genres: [],
			personal_notes: ''
		};
		customGenre = '';
		scrapingError = '';
		novelsStore.clearScrapingData();
	}

	function closeAddModal() {
		showAddModal = false;
	}

	async function scrapeNovelUpdates() {
		if (!modalForm.novelUpdatesUrl.trim()) {
			scrapingError = 'Please enter a valid Novel Updates URL';
			return;
		}

		scrapingLoading = true;
		scrapingError = '';

		try {
			const previewData = await novelsStore.previewNovel(modalForm.novelUpdatesUrl);

			// Fill form with scraped data
			modalForm.title = previewData.title;
			modalForm.author = previewData.author;
			modalForm.description = previewData.description;
			modalForm.source_url = previewData.source_url;
			modalForm.cover_url = previewData.cover_url || '';
			modalForm.novel_status = previewData.status;
			modalForm.genres = [...previewData.genres];
		} catch (error) {
			scrapingError = error instanceof Error ? error.message : 'Failed to scrape novel data';
		} finally {
			scrapingLoading = false;
		}
	}

	function toggleGenre(genre: string) {
		if (modalForm.genres.includes(genre)) {
			modalForm.genres = modalForm.genres.filter((g) => g !== genre);
		} else {
			modalForm.genres = [...modalForm.genres, genre];
		}
	}

	function addCustomGenre() {
		if (customGenre.trim() && !modalForm.genres.includes(customGenre.trim())) {
			modalForm.genres = [...modalForm.genres, customGenre.trim()];
			customGenre = '';
		}
	}

	function removeGenre(genre: string) {
		modalForm.genres = modalForm.genres.filter((g) => g !== genre);
	}

	async function submitForm() {
		// Validate required fields
		if (!modalForm.title.trim() || !modalForm.author.trim()) {
			alert('Title and Author are required fields.');
			return;
		}

		try {
			// Create new novel object
			const novelData = {
				title: modalForm.title.trim(),
				author: modalForm.author.trim(),
				description: modalForm.description.trim(),
				status: modalForm.novel_status.toLowerCase(),
				genres: modalForm.genres,
				cover_url: modalForm.cover_url.trim(),
				source_url: modalForm.source_url.trim(),
				total_chapters: 0,
				total_volumes: 0,
				content_type: 'chapters',
				raw_status: 'Unknown',
				rating: modalForm.rating === 'No rating' ? undefined : parseInt(modalForm.rating),
				user_status: modalForm.user_status,
				personal_notes: modalForm.personal_notes.trim()
			};

			await novelsStore.createNovel(novelData);
			closeAddModal();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to create novel');
		}
	}

	// Handle modal backdrop click
	function handleModalClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeAddModal();
		}
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeAddModal();
		}
	}

	// Clear error when component receives new error state
	$: if ($novelsError) {
		console.error('Novels error:', $novelsError);
	}
</script>

<svelte:window on:click={closeDropdowns} />

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-6">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">{config.APP_TITLE}</h1>
					<p class="mt-1 text-gray-600">{config.APP_DESCRIPTION}</p>
				</div>
				<button
					class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
					on:click={openAddModal}
					disabled={$novelsLoading}
				>
					<Plus class="mr-2 h-4 w-4" />
					Add Novel
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Error Message -->
		{#if $novelsError}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<X class="h-5 w-5 text-red-400" />
					</div>
					<div class="ml-3">
						<p class="text-sm text-red-600">{$novelsError}</p>
					</div>
					<div class="ml-auto pl-3">
						<button
							class="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
							on:click={() => novelsStore.clearError()}
						>
							<X class="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Loading State -->
		{#if $novelsLoading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
				<span class="ml-3 text-gray-600">Loading novels...</span>
			</div>
		{:else}
			<!-- Navigation Tabs -->
			<div class="mb-8 flex space-x-1">
				{#each tabs as tab (tab.id)}
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === tab.id
							? 'bg-gray-900 text-white'
							: 'bg-white text-gray-700 hover:bg-gray-100'}"
						on:click={() => (activeTab = tab.id)}
					>
						{tab.label} ({tab.count})
					</button>
				{/each}
			</div>

			<!-- Search and Filters -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row">
				<div class="relative flex-1">
					<input
						type="text"
						placeholder="Search novels or authors..."
						bind:value={searchQuery}
						class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
					/>
				</div>
				<div class="flex gap-4">
					<!-- Status Filter -->
					<div class="relative">
						<button
							class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
							on:click|stopPropagation={() => (showStatusDropdown = !showStatusDropdown)}
						>
							<Filter class="mr-2 h-4 w-4" />
							{statusFilter}
							<ChevronDown class="ml-2 h-4 w-4" />
						</button>
						{#if showStatusDropdown}
							<div
								class="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
							>
								<div class="py-1">
									{#each statusOptions as option (option)}
										<button
											class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 {statusFilter ===
											option
												? 'bg-gray-50 font-medium'
												: ''}"
											on:click={() => {
												statusFilter = option;
												showStatusDropdown = false;
											}}
										>
											{option}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Genre Filter -->
					<div class="relative">
						<button
							class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
							on:click|stopPropagation={() => (showGenreDropdown = !showGenreDropdown)}
						>
							{genreFilter}
							<ChevronDown class="ml-2 h-4 w-4" />
						</button>
						{#if showGenreDropdown}
							<div
								class="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
							>
								<div class="py-1">
									{#each genreOptions as option (option)}
										<button
											class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 {genreFilter ===
											option
												? 'bg-gray-50 font-medium'
												: ''}"
											on:click={() => {
												genreFilter = option;
												showGenreDropdown = false;
											}}
										>
											{option}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Novels Grid -->
			{#if tabFilteredNovels.length === 0}
				<div class="py-12 text-center">
					<Book class="mx-auto h-12 w-12 text-gray-400" />
					<h3 class="mt-2 text-sm font-medium text-gray-900">No novels found</h3>
					<p class="mt-1 text-sm text-gray-500">
						{activeTab === 'library'
							? 'Get started by adding your first novel.'
							: activeTab === 'favorites'
								? "You haven't favorited any novels yet."
								: 'No novels match your current filters.'}
					</p>
					{#if activeTab === 'library'}
						<div class="mt-6">
							<button
								class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
								on:click={openAddModal}
							>
								<Plus class="mr-2 h-4 w-4" />
								Add your first novel
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each tabFilteredNovels as novel (novel.id)}
						<div
							class="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg"
						>
							<!-- Image placeholder -->
							<div class="relative flex aspect-[3/4] items-center justify-center bg-gray-200">
								{#if novel.cover_url}
									<img src={novel.cover_url} alt={novel.title} class="h-full w-full object-cover" />
								{:else}
									<Image class="h-12 w-12 text-gray-400" />
								{/if}
								<button
									class="absolute top-3 right-3 rounded-full bg-white/80 p-2 transition-colors hover:bg-white"
									on:click={() => toggleFavorite(novel.id)}
								>
									<Heart
										class="h-4 w-4 {novel.isFavorite
											? 'fill-red-500 text-red-500'
											: 'text-gray-600'}"
									/>
								</button>
							</div>

							<!-- Content -->
							<div class="p-4">
								<h3 class="mb-1 line-clamp-2 text-lg font-semibold text-gray-900">
									{novel.title}
								</h3>
								<p class="mb-2 text-sm text-gray-600">{novel.author}</p>

								<!-- Genres -->
								<div class="mb-3 flex flex-wrap gap-1">
									{#each novel.genres.slice(0, 3) as genre (genre)}
										<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
											{genre}
										</span>
									{/each}
									{#if novel.genres.length > 3}
										<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
											+{novel.genres.length - 3}
										</span>
									{/if}
								</div>

								<!-- Progress and Rating -->
								<div class="flex items-center justify-between">
									<div class="flex items-center text-sm text-gray-500">
										<Book class="mr-1 h-4 w-4" />
										<span>{formatProgress(novel)}</span>
									</div>
									{#if novel.rating}
										<div class="flex items-center">
											<Star class="h-4 w-4 fill-current text-yellow-400" />
											<span class="ml-1 text-sm font-medium text-gray-900">{novel.rating}</span>
										</div>
									{/if}
								</div>

								<!-- Status -->
								<div class="mt-2">
									<span
										class="inline-flex rounded-full px-2 py-1 text-xs font-medium {novel.status ===
										'completed'
											? 'bg-green-100 text-green-800'
											: novel.status === 'ongoing'
												? 'bg-blue-100 text-blue-800'
												: 'bg-gray-100 text-gray-800'}"
									>
										{novel.status.charAt(0).toUpperCase() + novel.status.slice(1)}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Add Novel Modal -->
{#if showAddModal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
		on:click={handleModalClick}
		on:keydown={handleKeydown}
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
			role="document"
			on:click|stopPropagation
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-gray-200 p-6">
				<h2 id="modal-title" class="text-2xl font-bold text-gray-900">Add New Novel</h2>
				<button class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" on:click={closeAddModal}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="space-y-6 p-6">
				<!-- Scrape from Novel Updates -->
				<div>
					<h3 class="mb-2 text-lg font-semibold text-gray-900">Scrape from Novel Updates</h3>
					<p class="mb-4 text-sm text-gray-600">
						Paste a Novel Updates URL to automatically fill in novel information
					</p>
					<div class="flex gap-2">
						<input
							type="url"
							bind:value={modalForm.novelUpdatesUrl}
							placeholder="https://novelupdates.com/series/..."
							class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
						/>
						<button
							class="flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
							on:click={scrapeNovelUpdates}
							disabled={scrapingLoading}
						>
							{scrapingLoading ? 'Scraping...' : 'Scrape'}
							<Search class="ml-2 h-4 w-4" />
						</button>
					</div>
					{#if scrapingError}
						<p class="mt-2 text-sm text-red-500">{scrapingError}</p>
					{/if}
				</div>

				<!-- Basic Information -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Title *</label>
							<input
								type="text"
								bind:value={modalForm.title}
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
								required
							/>
						</div>
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Author *</label>
							<input
								type="text"
								bind:value={modalForm.author}
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
								required
							/>
						</div>
					</div>
					<div class="mt-4">
						<label class="mb-2 block text-sm font-medium text-gray-700">Description</label>
						<textarea
							bind:value={modalForm.description}
							placeholder="Novel description..."
							rows="3"
							class="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
						></textarea>
					</div>
					<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Source URL</label>
							<input
								type="url"
								bind:value={modalForm.source_url}
								placeholder="https://..."
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							/>
						</div>
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Cover Image URL</label>
							<input
								type="url"
								bind:value={modalForm.cover_url}
								placeholder="https://... (optional)"
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							/>
						</div>
					</div>
				</div>

				<!-- Status & Progress -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Status & Progress</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Your Status</label>
							<select
								bind:value={modalForm.user_status}
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							>
								{#each userStatusOptions as status (status)}
									<option value={status}>{status}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Novel Status</label>
							<select
								bind:value={modalForm.novel_status}
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							>
								{#each novelStatusOptions as status (status)}
									<option value={status}>{status}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Rating</label>
							<select
								bind:value={modalForm.rating}
								class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							>
								{#each ratingOptions as rating (rating)}
									<option value={rating}>{rating}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Genres -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Genres</h3>

					<!-- Selected Genres -->
					{#if modalForm.genres.length > 0}
						<div class="mb-4 flex flex-wrap gap-2">
							{#each modalForm.genres as genre (genre)}
								<span
									class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
								>
									{genre}
									<button
										class="ml-2 rounded-full hover:bg-blue-200"
										on:click={() => removeGenre(genre)}
									>
										<X class="h-3 w-3" />
									</button>
								</span>
							{/each}
						</div>
					{/if}

					<!-- Add Custom Genre -->
					<div class="mb-4 flex gap-2">
						<input
							type="text"
							bind:value={customGenre}
							placeholder="Add custom genre..."
							class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
							on:keydown={(e) => e.key === 'Enter' && addCustomGenre()}
						/>
						<button
							class="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
							on:click={addCustomGenre}
						>
							Add
						</button>
					</div>

					<!-- Predefined Genres -->
					<div class="flex flex-wrap gap-2">
						{#each predefinedGenres as genre (genre)}
							<button
								class="rounded-full px-3 py-1 text-sm transition-colors {modalForm.genres.includes(
									genre
								)
									? 'bg-blue-100 text-blue-800'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
								on:click={() => toggleGenre(genre)}
							>
								{genre}
							</button>
						{/each}
					</div>
				</div>

				<!-- Personal Notes -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Personal Notes</h3>
					<textarea
						bind:value={modalForm.personal_notes}
						placeholder="Your thoughts, reviews, or notes about this novel..."
						rows="4"
						class="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
					></textarea>
				</div>

				<!-- Modal Actions -->
				<div class="flex justify-end gap-4 border-t border-gray-200 pt-4">
					<button
						class="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-100"
						on:click={closeAddModal}
					>
						Cancel
					</button>
					<button
						class="rounded-lg bg-gray-900 px-6 py-2 text-white hover:bg-gray-800"
						on:click={submitForm}
					>
						Add Novel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
