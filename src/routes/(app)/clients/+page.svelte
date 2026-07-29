<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';
	import { CLIENT_STATUSES } from '$lib/schemas/client';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let clientToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(client: { id: string; name: string }) {
		clientToDelete = client;
		deleteModalOpen = true;
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
		prospective: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
	};

	function statusLabel(status: string) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>Clients - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
			<p class="text-gray-600 dark:text-gray-400">University clients and contracts</p>
		</div>
		<a href="/clients/new" class="btn btn-primary">+ Add Client</a>
	</div>

	<!-- Filters (GET form works without JS) -->
	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="search">Search</label>
			<input
				id="search"
				name="search"
				value={data.filters.search}
				class="input"
				placeholder="Name, contact, or city"
			/>
		</div>
		<div class="w-44">
			<label class="label" for="status">Status</label>
			<select id="status" name="status" class="input">
				<option value="">All statuses</option>
				{#each CLIENT_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{statusLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.clients.total} client{data.clients.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.clients.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🏢</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
					{data.clients.total === 0 && !data.filters.search && !data.filters.status
						? 'No clients yet'
						: 'No clients match your filters'}
				</h3>
				<a href="/clients/new" class="btn btn-primary mt-2 inline-block">+ Add Client</a>
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
								>Contact</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Location</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Status</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.clients.items as client (client.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<a
										href="/clients/{client.id}"
										class="font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
									>
										{client.name}
									</a>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{client.contactName || '-'}
									{#if client.contactEmail}
										<span class="block text-xs text-gray-500 dark:text-gray-400"
											>{client.contactEmail}</span
										>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{[client.city, client.state].filter(Boolean).join(', ') || '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
											client.status
										]}"
									>
										{statusLabel(client.status)}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/clients/{client.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">View</a
										>
										<a
											href="/clients/{client.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(client)}
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

			<Pagination
				page={data.clients.page}
				totalPages={data.clients.totalPages}
				basePath="/clients"
				filters={data.filters}
			/>
		{/if}
	</div>
</div>

<ConfirmDelete
	bind:open={deleteModalOpen}
	title="Delete Client"
	entity="Client"
	id={clientToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{clientToDelete?.name}</strong>? All buildings for this
		client will also be deleted. This action cannot be undone.
	</p>
</ConfirmDelete>
