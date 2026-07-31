<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import BillAllocation from '$lib/components/utilities/BillAllocation.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatCurrency, formatNumber, formatDateShort } from '$lib/utils/format';

	let { data, form } = $props();

	let canWrite = $derived(data.user.role === 'admin' || data.user.role === 'consultant');

	let deleteModalOpen = $state(false);
	let updatingStatus = $state(false);

	function variancePct(value: number | null): string {
		if (value === null) return '-';
		const pct = value * 100;
		return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
	}

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};

	const workflowButtons = [
		{ status: 'approved', label: '✓ Approve', cls: 'btn-secondary' },
		{ status: 'paid', label: '💵 Mark Paid', cls: 'btn-primary' },
		{ status: 'disputed', label: '⚠ Dispute', cls: 'btn-danger' },
		{ status: 'pending', label: '↺ Reset to Pending', cls: 'btn-secondary' }
	];
</script>

<svelte:head>
	<title>Bill Detail - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a
				href="/utilities/bills"
				class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
			>
				← Back to Bills
			</a>
			<h1 class="flex items-center gap-3 text-3xl font-bold text-gray-900 dark:text-white">
				{formatDateShort(data.bill.periodStart)} – {formatDateShort(data.bill.periodEnd)}
				<span class="inline-flex rounded-full px-3 py-1 text-sm {statusColors[data.bill.status]}">
					{formatEnumLabel(data.bill.status)}
				</span>
			</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Account {data.bill.accountNumber} · {formatEnumLabel(data.bill.accountUtilityType)}
				{#if data.bill.providerName}
					· {data.bill.providerName}{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<a href="/utilities/bills/{data.bill.id}/edit" class="btn btn-secondary">Edit</a>
			<button onclick={() => (deleteModalOpen = true)} class="btn btn-danger">Delete</button>
		</div>
	</div>

	{#if data.comparison && (data.comparison.isCostAnomaly || data.comparison.isUsageAnomaly)}
		<div
			class="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20"
		>
			<span class="text-2xl">⚠️</span>
			<div class="text-sm text-amber-800 dark:text-amber-200">
				<p class="mb-1 font-semibold">
					This bill deviates significantly from the account's history
				</p>
				<ul class="list-inside list-disc space-y-0.5">
					{#if data.comparison.isCostAnomaly}
						<li>
							Daily cost is {variancePct(data.comparison.costVariancePct)} vs. the average of
							{data.comparison.sampleSize} prior bill{data.comparison.sampleSize === 1 ? '' : 's'}
							({formatCurrency(data.comparison.baselineDailyCost)}/day)
						</li>
					{/if}
					{#if data.comparison.isUsageAnomaly}
						<li>
							Daily usage is {variancePct(data.comparison.usageVariancePct)} vs. the historical average
							({formatNumber(data.comparison.baselineDailyUsage, 1)}/day)
						</li>
					{/if}
				</ul>
			</div>
		</div>
	{/if}

	{#if data.chargesMismatch}
		<div
			class="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
		>
			<span class="text-2xl">❗</span>
			<p class="text-sm text-red-800 dark:text-red-200">
				Itemized charges sum to <strong>{formatCurrency(data.chargesSum)}</strong> but the bill
				total is <strong>{formatCurrency(data.bill.totalCost)}</strong>. Review the line items.
			</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{formatCurrency(data.bill.totalCost)}
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Usage</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{data.bill.usage !== null ? formatNumber(data.bill.usage) : '-'}
						{#if data.bill.unit}<span class="text-sm font-normal">{data.bill.unit}</span>{/if}
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Blended $/Unit</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{data.metrics.unitCost !== null ? '$' + data.metrics.unitCost.toFixed(4) : '-'}
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Period</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{data.metrics.periodDays ?? '-'}<span class="text-sm font-normal"> days</span>
					</p>
				</div>
			</div>

			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Charge Breakdown</h2>
				<dl class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each [{ label: 'Energy Charge', value: data.bill.energyCharge }, { label: 'Demand Charge', value: data.bill.demandCharge }, { label: 'Fixed Charge', value: data.bill.fixedCharge }, { label: 'Taxes & Fees', value: data.bill.taxesFees }, { label: 'Other Charges', value: data.bill.otherCharges }] as item (item.label)}
						<div class="flex justify-between py-2 text-sm">
							<dt class="text-gray-600 dark:text-gray-400">{item.label}</dt>
							<dd class="text-gray-900 dark:text-white">{formatCurrency(item.value)}</dd>
						</div>
					{/each}
					<div class="flex justify-between py-2 font-semibold">
						<dt class="text-gray-900 dark:text-white">Total</dt>
						<dd class="text-gray-900 dark:text-white">{formatCurrency(data.bill.totalCost)}</dd>
					</div>
				</dl>
			</div>

			<BillAllocation
				billId={data.bill.id}
				unit={data.bill.unit}
				{canWrite}
				context={data.allocationContext}
				saved={data.allocation}
				preview={form?.allocationPreview}
				errors={form?.allocationErrors}
				defaultNotes={form?.allocationNotes ?? ''}
			/>

			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
					Previous Bills on This Account
				</h2>
				{#if data.previousBills.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No earlier bills recorded for this account.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr
									class="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>
									<th scope="col" class="py-2 pr-4">Period</th>
									<th scope="col" class="py-2 pr-4 text-right">Usage</th>
									<th scope="col" class="py-2 pr-4 text-right">Total</th>
									<th scope="col" class="py-2 text-right">$/Day</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
								{#each data.previousBills as prev (prev.id)}
									<tr>
										<td class="py-2 pr-4">
											<a
												href="/utilities/bills/{prev.id}"
												class="text-primary-600 hover:underline dark:text-primary-400"
											>
												{formatDateShort(prev.periodStart)} – {formatDateShort(prev.periodEnd)}
											</a>
										</td>
										<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
											{prev.usage !== null ? formatNumber(prev.usage) : '-'}
										</td>
										<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
											{formatCurrency(prev.totalCost)}
										</td>
										<td class="py-2 text-right text-gray-900 dark:text-gray-100">
											{prev.metrics.dailyCost !== null
												? formatCurrency(prev.metrics.dailyCost)
												: '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			{#if data.bill.notes}
				<div class="card p-6">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
					<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{data.bill.notes}
					</p>
				</div>
			{/if}
		</div>

		<div class="space-y-6">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Workflow</h2>
				<div class="space-y-2">
					{#each workflowButtons as wf (wf.status)}
						{#if data.bill.status !== wf.status}
							<form
								method="POST"
								action="?/setStatus"
								use:enhance={() => {
									updatingStatus = true;
									return async ({ result }) => {
										updatingStatus = false;
										if (result.type === 'success') {
											toast.success(`Bill marked ${wf.status}`);
											await invalidateAll();
										} else {
											toast.error('Failed to update status');
										}
									};
								}}
							>
								<input type="hidden" name="status" value={wf.status} />
								<button type="submit" disabled={updatingStatus} class="btn {wf.cls} w-full text-sm">
									{wf.label}
								</button>
							</form>
						{/if}
					{/each}
				</div>
			</div>

			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Details</h2>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Statement Date</dt>
						<dd class="text-gray-900 dark:text-white">
							{formatDateShort(data.bill.statementDate)}
						</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Due Date</dt>
						<dd class="text-gray-900 dark:text-white">{formatDateShort(data.bill.dueDate)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Payment Date</dt>
						<dd class="text-gray-900 dark:text-white">{formatDateShort(data.bill.paymentDate)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Peak Demand</dt>
						<dd class="text-gray-900 dark:text-white">
							{data.bill.demandKw !== null ? formatNumber(data.bill.demandKw, 1) + ' kW' : '-'}
						</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Reading Type</dt>
						<dd class="text-gray-900 dark:text-white">{formatEnumLabel(data.bill.readingType)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Daily Cost</dt>
						<dd class="text-gray-900 dark:text-white">
							{data.metrics.dailyCost !== null
								? formatCurrency(data.metrics.dailyCost) + '/day'
								: '-'}
						</dd>
					</div>
					{#if data.bill.meterNumber}
						<div>
							<dt class="text-gray-500 dark:text-gray-400">Meter</dt>
							<dd class="text-gray-900 dark:text-white">{data.bill.meterNumber}</dd>
						</div>
					{/if}
					{#if data.bill.clientName}
						<div>
							<dt class="text-gray-500 dark:text-gray-400">Client</dt>
							<dd class="text-gray-900 dark:text-white">{data.bill.clientName}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
				<div class="space-y-2">
					<a
						href="/utilities/bills/new?account={data.bill.accountId}"
						class="btn btn-secondary block w-full text-center text-sm"
					>
						+ Enter Next Bill
					</a>
					<a
						href="/utilities/bills?account={data.bill.accountId}"
						class="btn btn-secondary block w-full text-center text-sm"
					>
						All Bills for Account
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Bill">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete this bill ({formatCurrency(data.bill.totalCost)})? This action
		cannot be undone.
	</p>

	{#snippet actions()}
		<button onclick={() => (deleteModalOpen = false)} class="btn btn-secondary">Cancel</button>
		<form method="POST" action="?/delete" use:enhance>
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
