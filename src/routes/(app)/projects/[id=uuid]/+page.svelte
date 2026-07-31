<script lang="ts">
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatCurrency, formatDateShort } from '$lib/utils/format';

	let { data } = $props();

	let budgetVariance = $derived.by(() => {
		const budget = Number(data.project.budget);
		const actual = Number(data.project.actualCost);
		if (!data.project.budget || !data.project.actualCost || isNaN(budget) || isNaN(actual))
			return null;
		return actual - budget;
	});
</script>

<svelte:head>
	<title>{data.project.name} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a
				href="/projects"
				class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
			>
				← Back to Projects
			</a>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{data.project.name}</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				{data.project.clientName ?? ''} · {formatEnumLabel(data.project.status)}
			</p>
		</div>
		<a href="/projects/{data.project.id}/edit" class="btn btn-secondary">Edit</a>
	</div>

	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<div class="card p-4">
			<p class="text-xs text-gray-500 dark:text-gray-400">Budget</p>
			<p class="text-xl font-bold text-gray-900 dark:text-white">
				{formatCurrency(data.project.budget)}
			</p>
		</div>
		<div class="card p-4">
			<p class="text-xs text-gray-500 dark:text-gray-400">Actual Cost</p>
			<p class="text-xl font-bold text-gray-900 dark:text-white">
				{formatCurrency(data.project.actualCost)}
			</p>
			{#if budgetVariance !== null}
				<p
					class="text-xs {budgetVariance > 0
						? 'text-red-600 dark:text-red-400'
						: 'text-green-600 dark:text-green-400'}"
				>
					{budgetVariance > 0 ? '+' : ''}{formatCurrency(budgetVariance)} vs budget
				</p>
			{/if}
		</div>
		<div class="card p-4">
			<p class="text-xs text-gray-500 dark:text-gray-400">Expected Savings/yr</p>
			<p class="text-xl font-bold text-gray-900 dark:text-white">
				{formatCurrency(data.project.expectedAnnualSavings)}
			</p>
		</div>
		<div class="card p-4">
			<p class="text-xs text-gray-500 dark:text-gray-400">Simple Payback</p>
			<p class="text-xl font-bold text-gray-900 dark:text-white">
				{data.project.roiYears ? `${Number(data.project.roiYears).toFixed(1)} yrs` : '-'}
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			{#if data.project.description}
				<div class="card p-6">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Description</h2>
					<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{data.project.description}
					</p>
				</div>
			{/if}

			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
					Buildings in Scope ({data.project.buildings.length})
				</h2>
				{#if data.project.buildings.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No buildings linked to this project.
					</p>
				{:else}
					<ul class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each data.project.buildings as b (b.id)}
							<li class="py-2">
								<a
									href="/buildings/{b.id}"
									class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
								>
									{b.name}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if data.project.notes}
				<div class="card p-6">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
					<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{data.project.notes}
					</p>
				</div>
			{/if}
		</div>

		<div class="space-y-6">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Schedule</h2>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Start Date</dt>
						<dd class="text-gray-900 dark:text-white">{formatDateShort(data.project.startDate)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">End Date</dt>
						<dd class="text-gray-900 dark:text-white">{formatDateShort(data.project.endDate)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Actual Annual Savings</dt>
						<dd class="text-gray-900 dark:text-white">
							{formatCurrency(data.project.actualAnnualSavings)}
						</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>
</div>
