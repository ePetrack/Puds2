<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let campusToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(campus: { id: string; name: string }) {
		campusToDelete = campus;
		deleteModalOpen = true;
	}

	function pageHref(page: number) {
		const params: string[] = [];
		if (data.filters.search) params.push(`search=${encodeURIComponent(data.filters.search)}`);
		if (data.filters.client) params.push(`client=${encodeURIComponent(data.filters.client)}`);
		if (page > 1) params.push(`page=${page}`);
		return params.length ? `/campuses?${params.join('&')}` : '/campuses';
	}
</script>

<svelte:head>
	<title>Campuses - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Campuses</h1>
			<p class="text-gray-600 dark:text-gray-400">Campus groupings within a client's portfolio</p>
		</div>
		<a href="/campuses/new" class="btn btn-primary">+ Add Campus</a>
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="search">Search</label>
			<input
				id="search"
				name="search"
				value={data.filters.search}
				class="input"
				placeholder="Campus name"
			/>
		</div>
		<div class="w-56">
			<label class="label" for="client">Client</label>
			<select id="client" name="client" class="input">
				<option value="">All clients</option>
				{#each data.clientOptions as client (client.id)}
					<option value={client.id} selected={data.filters.client === client.id}>
						{client.name}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.campuses.total} campus{data.campuses.total === 1 ? '' : 'es'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.campuses.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🎓</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
					{data.campuses.total === 0 && !data.filters.search && !data.filters.client
						? 'No campuses yet'
						: 'No campuses match your filters'}
				</h3>
				<a href="/campuses/new" class="btn btn-primary mt-2 inline-block">+ Add Campus</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Name</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Client</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Code</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>City</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.campuses.items as campus (campus.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<a
										href="/campuses/{campus.id}"
										class="font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
									>
										{campus.name}
									</a>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									{#if campus.client}
										<a
											href="/clients/{campus.client.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
										>
											{campus.client.name}
										</a>
									{:else}
										-
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{campus.code ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{campus.city ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/campuses/{campus.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">View</a
										>
										<a
											href="/campuses/{campus.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(campus)}
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

			{#if data.campuses.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Page {data.campuses.page} of {data.campuses.totalPages}
					</p>
					<div class="flex gap-2">
						{#if data.campuses.page > 1}
							<a href={pageHref(data.campuses.page - 1)} class="btn btn-secondary text-sm"
								>Previous</a
							>
						{/if}
						{#if data.campuses.page < data.campuses.totalPages}
							<a href={pageHref(data.campuses.page + 1)} class="btn btn-secondary text-sm">Next</a>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Campus">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{campusToDelete?.name}</strong>? Buildings and complexes
		will be detached, not deleted.
	</p>

	{#snippet actions()}
		<button onclick={() => (deleteModalOpen = false)} class="btn btn-secondary">Cancel</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return async ({ result }) => {
					deleteModalOpen = false;
					if (result.type === 'success') {
						toast.success('Campus deleted');
						await invalidateAll();
					} else {
						toast.error('Failed to delete campus');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={campusToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
