<script lang="ts">
	import { onMount } from 'svelte';
	import { chapters, chaptersError, chaptersLoading, chaptersStore } from '../stores/chapters.js';
	import { userPreferencesStore } from '../stores/user-preferences.js';
	import type { Chapter } from '../types/novel.js';
	// Icons
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	// Components
	import ChapterForm from './ChapterForm.svelte';
	import ChapterItem from './ChapterItem.svelte';

	export let novelId: number;
	export let currentChapter = 0;

	// Local state
	let searchQuery = '';
	let showAddForm = false;
	let editingChapter: Chapter | null = null;

	// Filtered chapters based on search
	$: filteredChapters = (() => {
		if (!searchQuery.trim()) return $chapters;

		const query = searchQuery.toLowerCase();
		return $chapters.filter(
			(chapter: Chapter) =>
				chapter.title.toLowerCase().includes(query) || chapter.number.toString().includes(query)
		);
	})();

	// Load chapters when component mounts
	onMount(() => {
		if (novelId) {
			chaptersStore.loadChapters(novelId);
		}
	});

	// Event handlers
	function handleAddChapter() {
		showAddForm = true;
		editingChapter = null;
	}

	function handleEditChapter(chapter: Chapter) {
		editingChapter = chapter;
		showAddForm = true;
	}

	function handleCloseForm() {
		showAddForm = false;
		editingChapter = null;
	}

	async function handleChapterSaved() {
		showAddForm = false;
		editingChapter = null;
		// Refresh chapters list
		await chaptersStore.loadChapters(novelId);
	}

	async function handleDeleteChapter(chapter: Chapter) {
		if (confirm(`Are you sure you want to delete "${chapter.title}"?`)) {
			try {
				await chaptersStore.deleteChapter(novelId, chapter.id);
			} catch (error) {
				console.error('Failed to delete chapter:', error);
			}
		}
	}

	async function handleMarkRead(chapter: Chapter) {
		try {
			await userPreferencesStore.updateProgress(novelId, chapter.number);
		} catch (error) {
			console.error('Failed to mark chapter as read:', error);
		}
	}

	function clearSearch() {
		searchQuery = '';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900">Chapters</h2>
		<button
			on:click={handleAddChapter}
			class="flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
		>
			<Plus class="mr-2 h-4 w-4" />
			Add Chapter
		</button>
	</div>

	<!-- Search Bar -->
	<div class="relative">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
			<Search class="h-4 w-4 text-gray-400" />
		</div>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search chapters..."
			class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
		/>
		{#if searchQuery}
			<button on:click={clearSearch} class="absolute inset-y-0 right-0 flex items-center pr-3">
				<X class="h-4 w-4 text-gray-400 hover:text-gray-600" />
			</button>
		{/if}
	</div>

	<!-- Error Message -->
	{#if $chaptersError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-center">
				<X class="mr-3 h-5 w-5 text-red-400" />
				<p class="text-sm text-red-600">{$chaptersError}</p>
				<button
					on:click={() => chaptersStore.clearError()}
					class="ml-auto rounded p-1 hover:bg-red-100"
				>
					<X class="h-4 w-4 text-red-500" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if $chaptersLoading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="mr-3 h-6 w-6 animate-spin text-gray-500" />
			<span class="text-gray-600">Loading chapters...</span>
		</div>
	{:else}
		<!-- Chapters List -->
		<div class="space-y-3">
			{#each filteredChapters as chapter (chapter.id)}
				<ChapterItem
					{chapter}
					{currentChapter}
					on:edit={() => handleEditChapter(chapter)}
					on:delete={() => handleDeleteChapter(chapter)}
					on:markRead={() => handleMarkRead(chapter)}
				/>
			{:else}
				<div class="py-8 text-center">
					<p class="text-gray-500">
						{searchQuery ? 'No chapters found matching your search.' : 'No chapters available yet.'}
					</p>
					{#if !searchQuery}
						<button
							on:click={handleAddChapter}
							class="mt-2 text-sm text-blue-600 hover:text-blue-800"
						>
							Add the first chapter
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Chapter Form Modal -->
{#if showAddForm}
	<ChapterForm
		{novelId}
		chapter={editingChapter}
		on:close={handleCloseForm}
		on:saved={handleChapterSaved}
	/>
{/if}
