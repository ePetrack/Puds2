<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatDateShort } from '$lib/utils/format';

	let { data, form } = $props();

	let uploadOpen = $state(false);
	let submitting = $state(false);
	let deleteModalOpen = $state(false);
	let docToDelete = $state<{ id: string; title: string } | null>(null);

	function confirmDelete(doc: { id: string; title: string }) {
		docToDelete = doc;
		deleteModalOpen = true;
	}

	function formatSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	let errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head>
	<title>Documents - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
			<p class="text-gray-600 dark:text-gray-400">Reports, audits, drawings, and contracts</p>
		</div>
		<button onclick={() => (uploadOpen = !uploadOpen)} class="btn btn-primary">
			{uploadOpen ? 'Close' : '+ Upload Document'}
		</button>
	</div>

	{#if uploadOpen}
		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						toast.success('Document uploaded');
						uploadOpen = false;
						await invalidateAll();
					} else {
						await update();
					}
				};
			}}
			class="card space-y-4 p-6"
		>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h2>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Title" required error={errors.title}>
					<input name="title" required class="input" placeholder="e.g., 2026 Energy Audit Report" />
				</FormField>
				<FormField label="File" required error={errors.file}>
					<input
						name="file"
						type="file"
						required
						class="block w-full text-sm text-gray-600 file:mr-4 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 dark:text-gray-400 dark:file:bg-primary-900 dark:file:text-primary-200"
					/>
				</FormField>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FormField label="Client" error={errors.clientId}>
					<select name="clientId" class="input">
						<option value="">None</option>
						{#each data.clientOptions as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Project" error={errors.projectId}>
					<select name="projectId" class="input">
						<option value="">None</option>
						{#each data.projectOptions as p (p.id)}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Building" error={errors.buildingId}>
					<select name="buildingId" class="input">
						<option value="">None</option>
						{#each data.buildingOptions as b (b.id)}
							<option value={b.id}>{b.name}</option>
						{/each}
					</select>
				</FormField>
			</div>

			<FormField label="Description" error={errors.description}>
				<textarea name="description" rows="2" class="input"></textarea>
			</FormField>

			<div class="flex justify-end gap-3">
				<button type="button" onclick={() => (uploadOpen = false)} class="btn btn-secondary">
					Cancel
				</button>
				<button type="submit" disabled={submitting} class="btn btn-primary">
					{submitting ? 'Uploading...' : 'Upload'}
				</button>
			</div>
		</form>
	{/if}

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="search">Search</label>
			<input
				id="search"
				name="search"
				value={data.filters.search}
				class="input"
				placeholder="Document title"
			/>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.documents.total} document{data.documents.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.documents.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">📁</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No documents found</h3>
				<button onclick={() => (uploadOpen = true)} class="btn btn-primary mt-2">
					+ Upload Document
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Title</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Linked To</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Size</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Uploaded</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.documents.items as doc (doc.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="px-6 py-4">
									<span class="font-medium text-gray-900 dark:text-white">{doc.title}</span>
									<span class="block text-xs text-gray-500 dark:text-gray-400">{doc.fileName}</span>
								</td>
								<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{[doc.clientName, doc.projectName, doc.buildingName]
										.filter(Boolean)
										.join(' · ') || '-'}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatSize(doc.sizeBytes)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatDateShort(String(doc.createdAt).slice(0, 10))}
									{#if doc.uploaderName}
										<span class="block text-xs text-gray-500 dark:text-gray-400"
											>by {doc.uploaderName}</span
										>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/documents/{doc.id}/download"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
											data-sveltekit-preload-data="off"
										>
											Download
										</a>
										<button
											onclick={() => confirmDelete(doc)}
											class="text-red-600 hover:text-red-900 dark:text-red-400"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<ConfirmDelete
	bind:open={deleteModalOpen}
	title="Delete Document"
	entity="Document"
	id={docToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{docToDelete?.title}</strong>? The stored file will be
		removed permanently.
	</p>
</ConfirmDelete>
