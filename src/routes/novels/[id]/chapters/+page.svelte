<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	// Icons
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Book from '@lucide/svelte/icons/book';
	// Components and stores
	import ChapterManager from '../../../../lib/components/ChapterManager.svelte';
	import {
		enhancedNovels,
		novelsStore,
		type EnhancedNovel
	} from '../../../../lib/stores/novels.js';

	// State
	let novel: EnhancedNovel | null = null;
	let loading = true;
	let error: string | null = null;

	// Get novel ID from route params
	$: novelId = $page.params.id ? parseInt($page.params.id) : null;
	$: if (browser && novelId && !isNaN(novelId)) {
		loadNovelData(novelId);
	}

	// Load novel data
	async function loadNovelData(id: number) {
		try {
			loading = true;
			error = null;

			// Load novels store to ensure data is available
			await novelsStore.loadNovels();

			// Get the enhanced novel from the store
			const enhancedNovelsData = get(enhancedNovels);
			novel = enhancedNovelsData.find((n) => n.id === id) || null;

			// If novel not found in enhanced novels, try to get base novel
			if (!novel) {
				const baseNovel = await novelsStore.getNovel(id);
				novel = baseNovel as EnhancedNovel;
			}
		} catch (err) {
			console.error('Failed to load novel:', err);
			error = err instanceof Error ? err.message : 'Failed to load novel';
		} finally {
			loading = false;
		}
	}

	// Navigation functions
	function goBack() {
		if (novelId) {
			goto(`/novels/${novelId}`);
		} else {
			goto('/');
		}
	}

	onMount(() => {
		// Component mounted, data loading handled by reactive statement
	});
</script>

<svelte:head>
	<title>{novel ? `${novel.title} - Chapters` : 'Chapters'} - Light Novel Bookmarks</title>
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
					Back to Novel
				</button>

				{#if novel}
					<div class="flex items-center">
						<Book class="mr-2 h-5 w-5 text-gray-600" />
						<span class="font-medium text-gray-900">{novel.title}</span>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Error Messages -->
		{#if error}
			<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<Book class="mr-3 h-5 w-5 text-red-400" />
					<p class="text-sm text-red-600">{error}</p>
				</div>
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
				<span class="ml-3 text-gray-600">Loading novel details...</span>
			</div>
		{:else if novel && novelId}
			<!-- Chapter Manager -->
			<ChapterManager {novelId} currentChapter={novel.currentChapter || 0} />
		{:else}
			<!-- Novel Not Found -->
			<div class="py-12 text-center">
				<Book class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<h3 class="mb-2 text-lg font-medium text-gray-900">Novel Not Found</h3>
				<p class="mb-4 text-gray-600">
					The novel you're looking for doesn't exist or has been removed.
				</p>
				<button
					on:click={() => goto('/')}
					class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
				>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Return to Library
				</button>
			</div>
		{/if}
	</div>
</div>
