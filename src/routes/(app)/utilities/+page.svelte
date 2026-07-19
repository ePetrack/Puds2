<script lang="ts">
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { formatCurrency, formatDateShort, formatMonthLabel } from '$lib/utils/format';
	import { formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();

	let maxMonthly = $derived(Math.max(...data.overview.monthlySpend.map((m) => m.total), 1));
	let maxTypeSpend = $derived(Math.max(...data.overview.spendByType.map((s) => s.total), 1));

	const typeIcons: Record<string, string> = {
		electricity: '⚡',
		natural_gas: '🔥',
		water: '💧',
		sewer: '🚰',
		steam: '♨️',
		chilled_water: '❄️',
		fuel_oil: '🛢️',
		propane: '🫙',
		other: '📊'
	};
</script>

<svelte:head>
	<title>Utilities - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Utilities</h1>
			<p class="text-gray-600 dark:text-gray-400">
				Accounts, meters, bills, and spend across the portfolio
			</p>
		</div>
		<a href="/utilities/bills/new" class="btn btn-primary">+ Enter Bill</a>
	</div>

	<UtilityNav />

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="card p-6">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Spend (Trailing 12 Months)</p>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">
				{formatCurrency(data.overview.totalSpend12mo)}
			</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{data.overview.billCount12mo} bills recorded
			</p>
		</div>
		<div class="card p-6">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Active Accounts</p>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">{data.accountStats.active}</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{data.accountStats.total} total</p>
		</div>
		<div class="card p-6">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Active Meters</p>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">{data.meterStats.active}</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{data.meterStats.total} total</p>
		</div>
		<div class="card p-6">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Pending Bills</p>
			<p
				class="text-3xl font-bold {data.overview.pendingCount > 0
					? 'text-amber-600 dark:text-amber-400'
					: 'text-gray-900 dark:text-white'}"
			>
				{data.overview.pendingCount}
			</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{formatCurrency(data.overview.pendingTotal)} awaiting review
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Monthly Spend Trend -->
		<div class="card p-6">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Monthly Spend (Last 12 Months)
			</h2>
			{#if data.overview.totalSpend12mo === 0}
				<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
					No bills recorded in the last 12 months
				</p>
			{:else}
				<div class="flex h-40 items-end gap-2">
					{#each data.overview.monthlySpend as month (month.month)}
						<div
							class="flex h-full flex-1 flex-col items-center justify-end gap-1"
							title="{month.month}: {formatCurrency(month.total)}"
						>
							<div
								class="min-h-[2px] w-full rounded-t bg-primary-500 transition-all dark:bg-primary-600"
								style="height: {Math.round((month.total / maxMonthly) * 100)}%"
							></div>
							<span class="text-[10px] text-gray-500 dark:text-gray-400">
								{formatMonthLabel(month.month)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Spend by Utility Type -->
		<div class="card p-6">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
				Spend by Utility Type
			</h2>
			{#if data.overview.spendByType.length === 0}
				<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No spend data yet</p>
			{:else}
				<div class="space-y-3">
					{#each data.overview.spendByType as item (item.type)}
						<div>
							<div class="mb-1 flex justify-between text-sm">
								<span class="text-gray-700 dark:text-gray-300">
									{typeIcons[item.type] || '📊'}
									{formatEnumLabel(item.type)}
								</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{formatCurrency(item.total)}
								</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
								<div
									class="h-full rounded-full bg-primary-500 dark:bg-primary-600"
									style="width: {Math.round((item.total / maxTypeSpend) * 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Bills Due Soon -->
		<div class="card p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Bills Due Soon</h2>
				<a
					href="/utilities/bills"
					class="text-sm text-primary-600 hover:underline dark:text-primary-400"
				>
					View all
				</a>
			</div>
			{#if data.overview.dueSoon.length === 0}
				<p class="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
					No unpaid bills with upcoming due dates
				</p>
			{:else}
				<ul class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each data.overview.dueSoon as bill (bill.id)}
						<li class="flex items-center justify-between gap-4 py-3">
							<div class="min-w-0">
								<a
									href="/utilities/bills/{bill.id}"
									class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
								>
									#{bill.accountNumber} · {formatEnumLabel(bill.accountUtilityType)}
								</a>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									Due {formatDateShort(bill.dueDate)}
								</p>
							</div>
							<span class="text-sm font-semibold text-gray-900 dark:text-white">
								{formatCurrency(bill.totalCost)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="card p-6">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
			<div class="grid grid-cols-2 gap-3">
				<a href="/utilities/bills/new" class="btn btn-primary text-center">Enter a Bill</a>
				<a href="/utilities/bills/import" class="btn btn-secondary text-center"
					>Import Bills (CSV)</a
				>
				<a href="/utilities/accounts" class="btn btn-secondary text-center">Manage Accounts</a>
				<a href="/utilities/meters" class="btn btn-secondary text-center">Manage Meters</a>
				<a href="/utilities/rates" class="btn btn-secondary text-center">Rate Schedules</a>
				<a href="/utilities/providers" class="btn btn-secondary text-center">Providers</a>
			</div>
		</div>
	</div>
</div>
