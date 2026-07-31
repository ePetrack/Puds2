<script lang="ts">
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { UTILITY_TYPES, formatEnumLabel } from '$lib/schemas/utility';
	import { formatCurrency, formatDateShort } from '$lib/utils/format';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let rateToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(rate: { id: string; name: string }) {
		rateToDelete = rate;
		deleteModalOpen = true;
	}

	function formatRate(value: string | null) {
		if (!value) return '-';
		return (
			'$' +
			Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
		);
	}
</script>

<svelte:head>
	<title>Rate Schedules - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Rate Schedules</h1>
			<p class="text-gray-600 dark:text-gray-400">Tariffs and pricing structures by provider</p>
		</div>
		<a href="/utilities/rates/new" class="btn btn-primary">+ Add Rate Schedule</a>
	</div>

	<UtilityNav />

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-56">
			<label class="label" for="provider">Provider</label>
			<select id="provider" name="provider" class="input">
				<option value="">All providers</option>
				{#each data.providerOptions as p (p.id)}
					<option value={p.id} selected={data.filters.provider === p.id}>{p.name}</option>
				{/each}
			</select>
		</div>
		<div class="w-48">
			<label class="label" for="type">Utility Type</label>
			<select id="type" name="type" class="input">
				<option value="">All types</option>
				{#each UTILITY_TYPES as type (type)}
					<option value={type} selected={data.filters.type === type}>{formatEnumLabel(type)}</option
					>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.rates.length} rate schedule{data.rates.length === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.rates.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">💲</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
					No rate schedules found
				</h3>
				<p class="mb-4 text-gray-600 dark:text-gray-400">
					Capture provider tariffs to validate bill charges
				</p>
				<a href="/utilities/rates/new" class="btn btn-primary">+ Add Rate Schedule</a>
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
								>Provider</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Type</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Structure</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Energy Rate</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Fixed Charge</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Effective</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.rates as rate (rate.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white"
									>{rate.name}</td
								>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
									>{rate.providerName ?? '-'}</td
								>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
									>{formatEnumLabel(rate.utilityType)}</td
								>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
									>{formatEnumLabel(rate.rateType)}</td
								>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatRate(rate.energyRate)}{rate.unit ? ` / ${rate.unit}` : ''}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatCurrency(rate.fixedMonthlyCharge)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatDateShort(rate.effectiveDate)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/utilities/rates/{rate.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(rate)}
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
	title="Delete Rate Schedule"
	entity="Rate schedule"
	id={rateToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{rateToDelete?.name}</strong>? Accounts referencing this
		schedule will lose the link.
	</p>
</ConfirmDelete>
