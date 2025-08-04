<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Chapter } from '../types/novel.js';
	// Icons
	import BookCheck from '@lucide/svelte/icons/book-check';
	import Edit from '@lucide/svelte/icons/edit';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	export let chapter: Chapter;
	export let currentChapter = 0;

	const dispatch = createEventDispatcher<{
		edit: void;
		delete: void;
		markRead: void;
	}>();

	$: isRead = chapter.number <= currentChapter;
	$: isCurrentlyReading = chapter.number === currentChapter + 1;

	function handleEdit() {
		dispatch('edit');
	}

	function handleDelete() {
		dispatch('delete');
	}

	function handleMarkRead() {
		dispatch('markRead');
	}

	function openChapterUrl() {
		if (chapter.source_url) {
			window.open(chapter.source_url, '_blank', 'noopener,noreferrer');
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50">
	<div class="flex items-center justify-between">
		<!-- Chapter Info -->
		<div class="min-w-0 flex-1">
			<div class="flex items-center space-x-3">
				<!-- Chapter Number -->
				<div class="flex-shrink-0">
					<span
						class="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800"
					>
						Ch. {chapter.number}
					</span>
				</div>

				<!-- Read Status Badge -->
				{#if isRead}
					<div
						class="flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
					>
						<BookCheck class="mr-1 h-3 w-3" />
						Read
					</div>
				{:else if isCurrentlyReading}
					<div
						class="flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
					>
						Next
					</div>
				{/if}
			</div>

			<!-- Chapter Title -->
			<h3 class="mt-1 truncate text-lg font-medium text-gray-900">
				{chapter.title}
			</h3>
		</div>

		<!-- Actions -->
		<div class="flex items-center space-x-2">
			<!-- Mark as Read Button (only for unread chapters) -->
			{#if !isRead}
				<button
					on:click={handleMarkRead}
					class="flex items-center rounded-md border border-green-600 bg-white px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50"
				>
					<BookCheck class="mr-1 h-4 w-4" />
					Mark Read
				</button>
			{/if}

			<!-- External Link Button -->
			{#if chapter.source_url}
				<button
					on:click={openChapterUrl}
					class="rounded-md border border-gray-300 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
					title="Open chapter URL"
				>
					<ExternalLink class="h-4 w-4" />
				</button>
			{/if}

			<!-- Edit Button -->
			<button
				on:click={handleEdit}
				class="rounded-md border border-gray-300 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
				title="Edit chapter"
			>
				<Edit class="h-4 w-4" />
			</button>

			<!-- Delete Button -->
			<button
				on:click={handleDelete}
				class="rounded-md border border-red-300 bg-white p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
				title="Delete chapter"
			>
				<Trash2 class="h-4 w-4" />
			</button>
		</div>
	</div>
</div>
