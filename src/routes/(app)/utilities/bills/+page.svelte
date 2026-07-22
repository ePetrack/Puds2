<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { toast } from '$lib/stores/toast';
	import { UTILITY_TYPES, BILL_STATUSES, formatEnumLabel } from '$lib/schemas/utility';
	import { formatCurrency, formatNumber, formatDateShort } from '$lib/utils/format';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let billToDelete = $state<{ id: string; totalCost: string } | null>(null);

	function confirmDelete(bill: { id: string; totalCost: string }) {
		billToDelete = bill;
		deleteModalOpen = true;
	}

	function unitCost(bill: { totalCost: string; usage: string | null }) {
		const usage = Number(bill.usage);
		if (!bill.usage || isNaN(usage) || usage <= 0) return '-';
		return '$' + (Number(bill.totalCost) / usage).toFixed(4);
	}

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};

	function pageHref(page: number) {
		const params: string[] = [];
		if (data.filters.account) params.push(`account=${encodeURIComponent(data.filters.account)}`);
		if (data.filters.type) params.push(`type=${encodeURIComponent(data.filters.type)}`);
		if (data.filters.status) params.push(`status=${encodeURIComponent(data.filters.status)}`);
		if (page > 1) params.push(`page=${page}`);
		return params.length ? `/utilities/bills?${params.join('&')}` : '/utilities/bills';
	}
</script>

<svelte:head>
	<title>Utility Bills - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Utility Bills</h1>
			<p class="text-gray-600 dark:text-gray-400">Bill entry, validation, and payment tracking</p>
		</div>
		<div class="flex gap-3">
			<a href="/utilities/bills/import" class="btn btn-secondary">Import CSV</a>
			<a href="/utilities/bills/new" class="btn btn-primary">+ Enter Bill</a>
		</div>
	</div>

	<UtilityNav />

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="account">Account</label>
			<select id="account" name="account" class="input">
				<option value="">All accounts</option>
				{#each data.accountOptions as a (a.id)}
					<option value={a.id} selected={data.filters.account === a.id}>{a.label}</option>
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
				{#each BILL_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.bills.total} bill{data.bills.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.bills.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🧾</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No bills found</h3>
				<div class="mt-2 flex justify-center gap-3">
					<a href="/utilities/bills/import" class="btn btn-secondary">Import CSV</a>
					<a href="/utilities/bills/new" class="btn btn-primary">+ Enter Bill</a>
				</div>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Period</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Account</th
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
								>Total</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>$/Unit</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Due</th
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
						{#each data.bills.items as bill (bill.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<a
										href="/utilities/bills/{bill.id}"
										class="font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
									>
										{formatDateShort(bill.periodStart)} – {formatDateShort(bill.periodEnd)}
									</a>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{bill.accountNumber ?? '-'}
									{#if bill.clientName}
										<span class="block text-xs text-gray-500 dark:text-gray-400"
											>{bill.clientName}</span
										>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(bill.accountUtilityType)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{bill.usage !== null
										? `${formatNumber(bill.usage)}${bill.unit ? ' ' + bill.unit : ''}`
										: '-'}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white"
								>
									{formatCurrency(bill.totalCost)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{unitCost(bill)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatDateShort(bill.dueDate)}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[bill.status]}"
									>
										{formatEnumLabel(bill.status)}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/utilities/bills/{bill.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">View</a
										>
										<a
											href="/utilities/bills/{bill.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(bill)}
											class="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button
										>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if data.bills.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Page {data.bills.page} of {data.bills.totalPages}
					</p>
					<div class="flex gap-2">
						{#if data.bills.page > 1}
							<a href={pageHref(data.bills.page - 1)} class="btn btn-secondary text-sm">Previous</a>
						{/if}
						{#if data.bills.page < data.bills.totalPages}
							<a href={pageHref(data.bills.page + 1)} class="btn btn-secondary text-sm">Next</a>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Bill">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete this bill ({formatCurrency(billToDelete?.totalCost)})? This
		action cannot be undone.
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
						toast.success('Bill deleted');
						await invalidateAll();
					} else {
						toast.error('Failed to delete bill');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={billToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
