<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { toast } from '$lib/stores/toast';
	import { UTILITY_TYPES, METER_STATUSES, formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let meterToDelete = $state<{ id: string; meterNumber: string } | null>(null);

	function confirmDelete(meter: { id: string; meterNumber: string }) {
		meterToDelete = meter;
		deleteModalOpen = true;
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		retired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
	};
</script>

<svelte:head>
	<title>Meters - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Meters</h1>
			<p class="text-gray-600 dark:text-gray-400">Physical and virtual meters across buildings</p>
		</div>
		<a href="/utilities/meters/new" class="btn btn-primary">+ Add Meter</a>
	</div>

	<UtilityNav />

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-56">
			<label class="label" for="building">Building</label>
			<select id="building" name="building" class="input">
				<option value="">All buildings</option>
				{#each data.buildingOptions as b (b.id)}
					<option value={b.id} selected={data.filters.building === b.id}>{b.name}</option>
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
		<div class="w-40">
			<label class="label" for="status">Status</label>
			<select id="status" name="status" class="input">
				<option value="">All statuses</option>
				{#each METER_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.meters.length} meter{data.meters.length === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.meters.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🔢</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No meters found</h3>
				<a href="/utilities/meters/new" class="btn btn-primary mt-2 inline-block">+ Add Meter</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Meter #</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Premise</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Type</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Unit</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Account</th
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
						{#each data.meters as meter (meter.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<span class="font-medium text-gray-900 dark:text-white">{meter.meterNumber}</span>
									{#if meter.isSubmeter}
										<span
											class="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
											title={meter.parentMeterNumber
												? `Submeter of ${meter.parentMeterNumber}`
												: 'Submeter'}
										>
											{meter.parentMeterNumber ? `↳ ${meter.parentMeterNumber}` : 'Submeter'}
										</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{meter.premiseName ?? '-'}
									{#if meter.complexName}
										<span
											class="ml-1 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200"
										>
											Complex
										</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(meter.utilityType)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(meter.unit)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{meter.accountNumber ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
											meter.status
										]}"
									>
										{formatEnumLabel(meter.status)}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/utilities/meters/{meter.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(meter)}
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

<Modal bind:open={deleteModalOpen} title="Delete Meter">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete meter <strong>{meterToDelete?.meterNumber}</strong>?
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
						toast.success('Meter deleted');
						await invalidateAll();
					} else {
						toast.error('Failed to delete meter');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={meterToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
