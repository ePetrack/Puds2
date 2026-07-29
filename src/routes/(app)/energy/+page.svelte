<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatNumber, formatDateShort, formatMonthLabel } from '$lib/utils/format';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let readingToDelete = $state<{ id: string; readingDate: string } | null>(null);

	function confirmDelete(reading: { id: string; readingDate: string }) {
		readingToDelete = reading;
		deleteModalOpen = true;
	}

	let maxUsage = $derived(Math.max(...data.series.map((p) => p.usage), 1));
	let totalUsage = $derived(data.series.reduce((s, p) => s + p.usage, 0));

	function pageHref(page: number) {
		const params: string[] = [];
		if (data.filters.meter) params.push(`meter=${encodeURIComponent(data.filters.meter)}`);
		if (data.filters.building) params.push(`building=${encodeURIComponent(data.filters.building)}`);
		if (page > 1) params.push(`page=${page}`);
		return params.length ? `/energy?${params.join('&')}` : '/energy';
	}
</script>

<svelte:head>
	<title>Energy Data - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Energy Data</h1>
			<p class="text-gray-600 dark:text-gray-400">Meter readings and consumption trends</p>
		</div>
		<div class="flex gap-3">
			<a href="/energy/degree-days" class="btn btn-secondary">Degree Days</a>
			<a href="/energy/import" class="btn btn-secondary">Import CSV</a>
			<a href="/energy/new" class="btn btn-primary">+ Add Reading</a>
		</div>
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="building">Building</label>
			<select id="building" name="building" class="input">
				<option value="">All buildings</option>
				{#each data.buildingOptions as b (b.id)}
					<option value={b.id} selected={data.filters.building === b.id}>{b.name}</option>
				{/each}
			</select>
		</div>
		<div class="w-64">
			<label class="label" for="meter">Meter</label>
			<select id="meter" name="meter" class="input">
				<option value="">All meters</option>
				{#each data.meterOptions as m (m.id)}
					<option value={m.id} selected={data.filters.meter === m.id}>{m.label}</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.readings.total} reading{data.readings.total === 1 ? '' : 's'}
		</p>
	</form>

	<!-- Monthly usage chart -->
	<div class="card p-6">
		<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
			Monthly Usage (Last 12 Months)
		</h2>
		{#if totalUsage === 0}
			<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
				No readings in the last 12 months for this selection
			</p>
		{:else}
			<div class="flex h-40 items-end gap-2">
				{#each data.series as point (point.month)}
					<div
						class="flex h-full flex-1 flex-col items-center justify-end gap-1"
						title="{point.month}: {formatNumber(point.usage)}"
					>
						<div
							class="min-h-[2px] w-full rounded-t bg-primary-500 transition-all dark:bg-primary-600"
							style="height: {Math.round((point.usage / maxUsage) * 100)}%"
						></div>
						<span class="text-[10px] text-gray-500 dark:text-gray-400">
							{formatMonthLabel(point.month)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="card overflow-hidden">
		{#if data.readings.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">⚡</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No readings found</h3>
				<div class="mt-2 flex justify-center gap-3">
					<a href="/energy/import" class="btn btn-secondary">Import CSV</a>
					<a href="/energy/new" class="btn btn-primary">+ Add Reading</a>
				</div>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Date</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Meter</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Building</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Type</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Usage</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Demand (kW)</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Source</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.readings.items as reading (reading.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td
									class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white"
								>
									{formatDateShort(reading.readingDate)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{reading.meterNumber ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{reading.buildingName ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(reading.utilityType)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatNumber(reading.usage)}
									{reading.meterUnit ? formatEnumLabel(reading.meterUnit) : ''}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{reading.demandKw !== null ? formatNumber(reading.demandKw, 1) : '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(reading.source)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<button
										onclick={() => confirmDelete(reading)}
										class="text-red-600 hover:text-red-900 dark:text-red-400"
									>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if data.readings.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Page {data.readings.page} of {data.readings.totalPages}
					</p>
					<div class="flex gap-2">
						{#if data.readings.page > 1}
							<a href={pageHref(data.readings.page - 1)} class="btn btn-secondary text-sm"
								>Previous</a
							>
						{/if}
						{#if data.readings.page < data.readings.totalPages}
							<a href={pageHref(data.readings.page + 1)} class="btn btn-secondary text-sm">Next</a>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Reading">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete the reading for
		<strong>{formatDateShort(readingToDelete?.readingDate)}</strong>?
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
						toast.success('Reading deleted');
						await invalidateAll();
					} else {
						toast.error('Failed to delete reading');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={readingToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
