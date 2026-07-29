<script lang="ts">
	import { formatNumber, formatMonthYear } from '$lib/utils/format';
	import { MIN_BASELINE_MONTHS } from '$lib/schemas/degree-days';

	let { data } = $props();

	function pageHref(page: number) {
		const params: string[] = [];
		if (data.filters.station) params.push(`station=${encodeURIComponent(data.filters.station)}`);
		if (page > 1) params.push(`page=${page}`);
		return params.length ? `/energy/degree-days?${params.join('&')}` : '/energy/degree-days';
	}
</script>

<svelte:head>
	<title>Degree Days - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<a
				href="/energy"
				class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
			>
				← Back to Energy Data
			</a>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Degree Days</h1>
			<p class="text-gray-600 dark:text-gray-400">
				Weather series behind weather-normalised bill allocation
			</p>
		</div>
		<a href="/energy/degree-days/import" class="btn btn-primary">Import CSV</a>
	</div>

	<div class="card p-6">
		<h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Coverage</h2>
		<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
			Weather-normalised allocation needs at least {MIN_BASELINE_MONTHS} months of history per building.
			A series shorter than that is stored, but won't be used.
		</p>

		{#if data.coverage.length === 0}
			<p class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
				No degree days stored yet — import a series to enable weather-normalised allocation.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Station</th
							>
							<th
								class="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Base temp</th
							>
							<th
								class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Span</th
							>
							<th
								class="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Months</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each data.coverage as series (series.station + series.baseTempF)}
							<tr>
								<td class="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
									<a
										href="/energy/degree-days?station={encodeURIComponent(series.station)}"
										class="hover:underline">{series.station}</a
									>
								</td>
								<td class="px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-100">
									{series.baseTempF}°F
								</td>
								<td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
									{formatMonthYear(series.firstPeriod)} – {formatMonthYear(series.lastPeriod)}
								</td>
								<td class="px-4 py-2 text-right text-sm">
									{#if series.months < MIN_BASELINE_MONTHS}
										<span class="font-medium text-amber-600 dark:text-amber-400"
											>{series.months}</span
										>
									{:else}
										<span class="text-gray-900 dark:text-gray-100">{series.months}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="station">Station</label>
			<select id="station" name="station" class="input">
				<option value="">All stations</option>
				{#each data.coverage as series (series.station + series.baseTempF)}
					<option value={series.station} selected={data.filters.station === series.station}>
						{series.station}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.degreeDays.total} month{data.degreeDays.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.degreeDays.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🌡️</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No degree days found</h3>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					Import a series from your weather provider to enable weather-normalised allocation.
				</p>
				<a href="/energy/degree-days/import" class="btn btn-primary">Import CSV</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Month</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Station</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Base temp</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>HDD</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>CDD</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Source</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.degreeDays.items as row (row.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td
									class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white"
								>
									{formatMonthYear(row.period)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{row.station}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatNumber(row.baseTempF, 0)}°F
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatNumber(row.hdd, 1)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatNumber(row.cdd, 1)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
									{row.source ?? '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if data.degreeDays.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Page {data.degreeDays.page} of {data.degreeDays.totalPages}
					</p>
					<div class="flex gap-2">
						{#if data.degreeDays.page > 1}
							<a href={pageHref(data.degreeDays.page - 1)} class="btn btn-secondary text-sm"
								>Previous</a
							>
						{/if}
						{#if data.degreeDays.page < data.degreeDays.totalPages}
							<a href={pageHref(data.degreeDays.page + 1)} class="btn btn-secondary text-sm">Next</a
							>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
