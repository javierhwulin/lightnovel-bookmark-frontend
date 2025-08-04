<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { chaptersStore } from '../stores/chapters.js';
	import type { Chapter, CreateChapterRequest, UpdateChapterRequest } from '../types/novel.js';
	// Icons
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Save from '@lucide/svelte/icons/save';
	import X from '@lucide/svelte/icons/x';

	export let novelId: number;
	export let chapter: Chapter | null = null;

	const dispatch = createEventDispatcher<{
		close: void;
		saved: Chapter;
	}>();

	// Form state
	let title = chapter?.title || '';
	let number = chapter?.number || 0;
	let sourceUrl = chapter?.source_url || '';
	let errors: Record<string, string> = {};
	let isSubmitting = false;

	// Determine if we're editing or creating
	$: isEditing = chapter !== null;
	$: modalTitle = isEditing ? 'Edit Chapter' : 'Add Chapter';

	// Form validation
	function validateForm(): boolean {
		errors = {};

		if (!title.trim()) {
			errors.title = 'Chapter title is required';
		}

		if (!number || number <= 0) {
			errors.number = 'Chapter number must be greater than 0';
		}

		if (!sourceUrl.trim()) {
			errors.sourceUrl = 'Source URL is required';
		} else {
			try {
				new URL(sourceUrl);
			} catch {
				errors.sourceUrl = 'Please enter a valid URL';
			}
		}

		return Object.keys(errors).length === 0;
	}

	// Event handlers
	function handleClose() {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		isSubmitting = true;
		try {
			let savedChapter: Chapter;

			if (isEditing && chapter) {
				const updates: UpdateChapterRequest = {
					title: title.trim(),
					number,
					source_url: sourceUrl.trim()
				};
				savedChapter = await chaptersStore.updateChapter(novelId, chapter.id, updates);
			} else {
				const chapterData: CreateChapterRequest = {
					title: title.trim(),
					number,
					source_url: sourceUrl.trim()
				};
				savedChapter = await chaptersStore.createChapter(novelId, chapterData);
			}

			dispatch('saved', savedChapter);
		} catch (error) {
			console.error('Failed to save chapter:', error);
			// The error will be shown by the ChapterManager through the store
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
	class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
	on:click={handleBackdropClick}
>
	<!-- Modal Content -->
	<div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
		<!-- Modal Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-semibold text-gray-900">{modalTitle}</h2>
			<button
				on:click={handleClose}
				class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Form -->
		<form on:submit|preventDefault={handleSubmit} class="px-6 py-4">
			<div class="space-y-4">
				<!-- Chapter Number -->
				<div>
					<label for="chapter-number" class="block text-sm font-medium text-gray-700">
						Chapter Number *
					</label>
					<input
						id="chapter-number"
						type="number"
						bind:value={number}
						min="0.1"
						step="0.1"
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 {errors.number
							? 'border-red-300'
							: ''}"
						required
					/>
					{#if errors.number}
						<p class="mt-1 text-sm text-red-600">{errors.number}</p>
					{/if}
				</div>

				<!-- Chapter Title -->
				<div>
					<label for="chapter-title" class="block text-sm font-medium text-gray-700">
						Chapter Title *
					</label>
					<input
						id="chapter-title"
						type="text"
						bind:value={title}
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 {errors.title
							? 'border-red-300'
							: ''}"
						placeholder="Enter chapter title..."
						required
					/>
					{#if errors.title}
						<p class="mt-1 text-sm text-red-600">{errors.title}</p>
					{/if}
				</div>

				<!-- Source URL -->
				<div>
					<label for="source-url" class="block text-sm font-medium text-gray-700">
						Source URL *
					</label>
					<input
						id="source-url"
						type="url"
						bind:value={sourceUrl}
						class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 {errors.sourceUrl
							? 'border-red-300'
							: ''}"
						placeholder="https://example.com/chapter-url"
						required
					/>
					{#if errors.sourceUrl}
						<p class="mt-1 text-sm text-red-600">{errors.sourceUrl}</p>
					{/if}
					<p class="mt-1 text-sm text-gray-500">URL where this chapter can be read online</p>
				</div>
			</div>

			<!-- Form Actions -->
			<div class="mt-6 flex items-center justify-end space-x-3">
				<button
					type="button"
					on:click={handleClose}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					disabled={isSubmitting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="flex items-center rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						<Save class="mr-2 h-4 w-4" />
						{isEditing ? 'Update Chapter' : 'Add Chapter'}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
