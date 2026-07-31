<script lang="ts">
	import { STATUS_LABEL, type ReconciliationStatus } from '$lib/schemas/reconciliation';
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatNumber, formatMonthLabel } from '$lib/utils/format';

	let { data } = $props();

	let recon = $derived(data.reconciliation);
	let meter = $derived(recon?.meter ?? null);

	const statusColors: Record<ReconciliationStatus, string> = {
		balanced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		unaccounted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		over_metered: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
		no_master: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
		no_submeters: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
	};

	const pct = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '' : ''}${v.toFixed(2)}%`);

	/** Statuses actually present, so the legend explains only what's on screen. */
	let shownStatuses = $derived([...new Set((recon?.periods ?? []).map((p) => p.status))]);
</script>

<svelte:head>
	<title>Reconciliation - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Meter Reconciliation</h1>
		<p class="text-gray-600 dark:text-gray-400">
			A master meter against the sum of the submeters beneath it, period by period. The gap is
			unaccounted energy — common-area load, house load, or distribution loss.
		</p>
	</div>

	{#if data.meters.length === 0}
		<div class="card py-12 text-center">
			<div class="mb-4 text-6xl">⚖️</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				No meters have submeters yet
			</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Reconciliation needs a master meter with at least one submeter beneath it. Set a parent
				meter from Facility Management.
			</p>
		</div>
	{:else}
		<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
			<div class="w-72">
				<label class="label" for="meter">Master meter</label>
				<select id="meter" name="meter" class="input">
					{#each data.meters as m (m.id)}
						<option value={m.id} selected={data.selectedId === m.id}>
							{m.meterNumber} — {m.premiseName ?? 'no premise'} ({m.submeterCount} submeter{m.submeterCount ===
							1
								? ''
								: 's'})
						</option>
					{/each}
				</select>
			</div>
			<div class="w-40">
				<label class="label" for="months">Period</label>
				<select id="months" name="months" class="input">
					{#each [6, 12, 24, 36] as m (m)}
						<option value={m} selected={data.filters.months === m}>Last {m} months</option>
					{/each}
				</select>
			</div>
			<div class="w-40">
				<label class="label" for="tolerance">Tolerance</label>
				<input
					id="tolerance"
					name="tolerance"
					type="number"
					step="0.5"
					min="0"
					max="50"
					value={data.filters.tolerance}
					class="input"
				/>
			</div>
			<button type="submit" class="btn btn-secondary">Apply</button>
			<p class="pb-2 text-xs text-gray-500 dark:text-gray-400">
				Deltas within the tolerance band count as balanced — metering accuracy and read-date drift
				live here.
			</p>
		</form>

		{#if recon && meter}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Master total</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{formatNumber(recon.summary.masterTotal, 0)}
						<span class="text-sm font-normal">{formatEnumLabel(meter.unit)}</span>
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Submeters total</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{formatNumber(recon.summary.submeterTotal, 0)}
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Unaccounted</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{formatNumber(recon.summary.delta, 0)}
					</p>
				</div>
				<div class="card p-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">Share unaccounted</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">
						{pct(recon.summary.deltaPct)}
					</p>
				</div>
			</div>

			<!-- Partial coverage is the normal state; only the impossible direction is a defect. -->
			{#if recon.summary.overMeteredPeriods > 0}
				<div
					class="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
				>
					<span class="text-2xl">❗</span>
					<div class="text-sm text-red-800 dark:text-red-200">
						<p class="mb-1 font-semibold">
							{recon.summary.overMeteredPeriods} period{recon.summary.overMeteredPeriods === 1
								? ''
								: 's'} where submeters read more than the master
						</p>
						<p>{STATUS_LABEL.over_metered.meaning}</p>
					</div>
				</div>
			{/if}

			{#if recon.summary.missingMasterPeriods > 0}
				<div
					class="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20"
				>
					<span class="text-2xl">⚠️</span>
					<p class="text-sm text-amber-800 dark:text-amber-200">
						{recon.summary.missingMasterPeriods} period{recon.summary.missingMasterPeriods === 1
							? ''
							: 's'} have submeter reads but no master read. They are excluded from the totals above —
						counting them would understate the gap against a master that never covered them.
					</p>
				</div>
			{/if}

			<div class="card p-6">
				<h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
					{meter.meterNumber}
					<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
						· {meter.premiseName ?? 'no premise'} · {formatEnumLabel(meter.utilityType)}
					</span>
				</h2>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					Compared against {recon.submeters.length} submeter{recon.submeters.length === 1
						? ''
						: 's'}:
					{recon.submeters.map((s) => s.meterNumber).join(', ')}
				</p>

				{#if recon.periods.length === 0}
					<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
						No readings in this window. Widen the period, or add meter readings from Energy Data.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm" data-testid="reconciliation-table">
							<thead>
								<tr
									class="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>
									<th scope="col" class="py-2 pr-4">Period</th>
									<th scope="col" class="py-2 pr-4 text-right">Master</th>
									<th scope="col" class="py-2 pr-4 text-right">Submeters</th>
									<th scope="col" class="py-2 pr-4 text-right">Reporting</th>
									<th scope="col" class="py-2 pr-4 text-right">Delta</th>
									<th scope="col" class="py-2 pr-4 text-right">Delta %</th>
									<th scope="col" class="py-2">Status</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
								{#each recon.periods as p (p.period)}
									<tr>
										<td class="py-2 pr-4 text-gray-900 dark:text-gray-100">
											{formatMonthLabel(p.period)}
											{p.period.slice(0, 4)}
										</td>
										<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
											{p.masterUsage === null ? '—' : formatNumber(p.masterUsage, 0)}
										</td>
										<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
											{formatNumber(p.submeterTotal, 0)}
										</td>
										<td class="py-2 pr-4 text-right text-gray-500 dark:text-gray-400">
											{p.submeterCount}/{recon.submeters.length}
										</td>
										<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
											{p.delta === null ? '—' : formatNumber(p.delta, 0)}
										</td>
										<td class="py-2 pr-4 text-right font-medium text-gray-900 dark:text-white">
											{pct(p.deltaPct)}
										</td>
										<td class="py-2">
											<span
												class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
													p.status
												]}"
												title={STATUS_LABEL[p.status].meaning}
											>
												{STATUS_LABEL[p.status].label}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<dl class="mt-6 space-y-2 border-t border-gray-200 pt-4 text-xs dark:border-gray-700">
						{#each shownStatuses as s (s)}
							<div class="flex gap-3">
								<dt class="w-28 shrink-0">
									<span class="inline-flex rounded-full px-2 py-0.5 {statusColors[s]}">
										{STATUS_LABEL[s].label}
									</span>
								</dt>
								<dd class="text-gray-600 dark:text-gray-400">{STATUS_LABEL[s].meaning}</dd>
							</div>
						{/each}
					</dl>
				{/if}
			</div>
		{/if}
	{/if}
</div>
