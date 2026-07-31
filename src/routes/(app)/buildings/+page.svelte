<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let buildingToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(building: { id: string; name: string }) {
		buildingToDelete = building;
		deleteModalOpen = true;
	}

	function typeLabel(value: string | null) {
		if (!value) return '-';
		return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<svelte:head>
	<title>Buildings - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Buildings</h1>
			<p class="text-gray-600 dark:text-gray-400">Building inventory across all clients</p>
		</div>
		<a href="/buildings/new" class="btn btn-primary">+ Add Building</a>
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="search">Search</label>
			<input
				id="search"
				name="search"
				value={data.filters.search}
				class="input"
				placeholder="Building name"
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
			{data.buildings.total} building{data.buildings.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.buildings.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🏛️</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
					{data.buildings.total === 0 && !data.filters.search && !data.filters.client
						? 'No buildings yet'
						: 'No buildings match your filters'}
				</h3>
				<a href="/buildings/new" class="btn btn-primary mt-2 inline-block">+ Add Building</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Name</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Client</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Type</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Sq Ft</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Year</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.buildings.items as building (building.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<a
										href="/buildings/{building.id}"
										class="font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
									>
										{building.name}
									</a>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									{#if building.client}
										<a
											href="/clients/{building.client.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
										>
											{building.client.name}
										</a>
									{:else}
										-
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{typeLabel(building.buildingType)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{building.squareFootage?.toLocaleString() ?? '-'}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{building.yearBuilt ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/buildings/{building.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">View</a
										>
										<a
											href="/buildings/{building.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(building)}
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
				page={data.buildings.page}
				totalPages={data.buildings.totalPages}
				basePath="/buildings"
				filters={data.filters}
			/>
		{/if}
	</div>
</div>

<ConfirmDelete
	bind:open={deleteModalOpen}
	title="Delete Building"
	entity="Building"
	id={buildingToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{buildingToDelete?.name}</strong>? This action cannot be
		undone.
	</p>
</ConfirmDelete>
