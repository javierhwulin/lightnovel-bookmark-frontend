<script lang="ts">
	import Book from '@lucide/svelte/icons/book';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Filter from '@lucide/svelte/icons/filter';
	import Heart from '@lucide/svelte/icons/heart';
	import Image from '@lucide/svelte/icons/image';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';

	// Types
	interface Novel {
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
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface Chapter {
		id: number;
		novel_id: number;
		number: number;
		title: string;
		source_url: string;
	}

	let activeTab = 'library';
	let searchQuery = '';
	let statusFilter = 'All Status';
	let genreFilter = 'All Genres';
	let showStatusDropdown = false;
	let showGenreDropdown = false;

	const statusOptions = ['All Status', 'Reading', 'Completed', 'Dropped', 'Wishlist'];

	const novels: Novel[] = [
		{
			id: 1,
			title: 'That Time I Got Reincarnated as a Slime',
			author: 'Fuse & 伏瀬',
			description:
				'A story about a man who dies and is reincarnated as a slime in another world...',
			status: 'ongoing',
			genres: ['Fantasy', 'Adventure', 'Comedy'],
			cover_url: '',
			source_url: 'https://www.novelupdates.com/series/tensei-shitara-slime-datta-ken/',
			total_chapters: 355,
			total_volumes: 0,
			content_type: 'chapters',
			raw_status: '355 Chapters (Completed)',
			isFavorite: false,
			current_chapter: 1,
			rating: 5
		},
		{
			id: 2,
			title: 'Overlord',
			author: 'Kugane Maruyama',
			description: 'The story of a powerful wizard who gets trapped in a virtual reality game...',
			status: 'ongoing',
			genres: ['Fantasy', 'Action', 'Supernatural'],
			cover_url: '',
			source_url: 'https://www.novelupdates.com/series/overlord/',
			total_chapters: 0,
			total_volumes: 18,
			content_type: 'volumes',
			raw_status: '18 Volumes (Ongoing)',
			isFavorite: false,
			current_chapter: 4,
			rating: 4
		},
		{
			id: 3,
			title: 'Solo Leveling',
			author: 'Chugong',
			description: 'A weak hunter becomes the strongest after a mysterious system awakens...',
			status: 'completed',
			genres: ['Action', 'Adventure', 'Fantasy'],
			cover_url: '',
			source_url: 'https://www.novelupdates.com/series/solo-leveling/',
			total_chapters: 270,
			total_volumes: 0,
			content_type: 'chapters',
			raw_status: '270 Chapters (Completed)',
			isFavorite: false,
			rating: undefined
		}
	];

	// Get unique genres from all novels
	const allGenres = [...new Set(novels.flatMap((novel) => novel.genres))].sort();
	const genreOptions = ['All Genres', ...allGenres];

	const tabs = [
		{ id: 'library', label: 'Library', count: novels.length },
		{ id: 'favorites', label: 'Favorites', count: novels.filter((n) => n.isFavorite).length },
		{ id: 'wishlist', label: 'Wishlist', count: 0 }
	];

	function toggleFavorite(novelId: number) {
		const novel = novels.find((n) => n.id === novelId);
		if (novel) {
			novel.isFavorite = !novel.isFavorite;
		}
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
</script>

<svelte:window on:click={closeDropdowns} />

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-6">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Light Novel Tracker</h1>
					<p class="mt-1 text-gray-600">Manage your reading journey</p>
				</div>
				<button
					class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
				>
					<Plus class="mr-2 h-4 w-4" />
					Add Novel
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each novels as novel (novel.id)}
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
								class="h-4 w-4 {novel.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}"
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
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
