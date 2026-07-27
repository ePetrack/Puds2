<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatCurrency, formatNumber } from '$lib/utils/format';
	import { ALLOCATION_METHODS, ALLOCATION_METHOD_INFO } from '$lib/schemas/allocation';

	/** Numeric columns arrive as `number` from a preview and as `string` from the DB. */
	type Amount = number | string | null;

	interface Line {
		buildingId: string | null;
		label: string;
		basisValue: Amount;
		sharePct: Amount;
		usage: Amount;
		demandKw: Amount;
		energyCost: Amount;
		demandCost: Amount;
		fixedCost: Amount;
		totalCost: Amount;
		isRemainder: boolean;
	}

	interface Props {
		billId: string;
		unit: string | null;
		canWrite: boolean;
		context: {
			available: boolean;
			reason?: string;
			targets: { buildingId: string; label: string }[];
			warnings: string[];
		};
		saved:
			| {
					method: string;
					notes: string | null;
					createdAt: Date | string;
					lines: Line[];
					warnings?: unknown;
			  }
			| null
			| undefined;
		preview: { method: string; lines: Line[]; warnings: string[] } | null | undefined;
		errors: Record<string, string> | undefined;
		defaultNotes?: string;
	}

	let {
		billId,
		unit,
		canWrite,
		context,
		saved,
		preview,
		errors,
		defaultNotes = ''
	}: Props = $props();

	// The picker is uncontrolled until the operator touches it, so a fresh preview or a
	// newly saved allocation coming back from the server selects itself.
	let chosenMethod = $state('');
	let removeModalOpen = $state(false);

	let method = $derived(chosenMethod || preview?.method || saved?.method || 'submetered');
	let methodInfo = $derived(
		ALLOCATION_METHOD_INFO[method as (typeof ALLOCATION_METHODS)[number]] ??
			ALLOCATION_METHOD_INFO.submetered
	);
	let shown = $derived(preview ?? saved ?? null);
	let isPreview = $derived(preview != null);
	// `warnings` is jsonb on the saved row, so it arrives untyped.
	let shownWarnings = $derived(Array.isArray(shown?.warnings) ? (shown.warnings as string[]) : []);
	let notesValue = $derived(defaultNotes || saved?.notes || '');

	const n = (v: Amount) => (v === null || v === undefined ? 0 : Number(v));
	const sum = (lines: Line[], key: keyof Line) =>
		lines.reduce((a, l) => a + n(l[key] as Amount), 0);
</script>

<div class="card p-6" id="allocation">
	<div class="mb-1 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Cost Allocation</h2>
		{#if saved && !isPreview}
			<span
				class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
			>
				Saved · {ALLOCATION_METHOD_INFO[saved.method as (typeof ALLOCATION_METHODS)[number]]
					?.label ?? saved.method}
			</span>
		{/if}
	</div>
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		Splits this bill across the buildings the premise serves. Energy, demand and fixed charges are
		allocated <strong>separately</strong> — a building with modest consumption can still drive the demand
		charge — and the parts sum exactly to the invoice total.
	</p>

	{#if !context.available}
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
		>
			<p><strong>Allocation isn't available for this bill.</strong> {context.reason}</p>
			<p class="mt-1">
				Allocation applies to a bill on a complex master meter, where one invoice covers several
				buildings.
			</p>
		</div>
	{:else}
		{#if errors?._form}
			<p class="mb-3 text-sm text-red-600 dark:text-red-400">{errors._form}</p>
		{/if}

		{#if canWrite}
			<form
				method="POST"
				class="mb-6 space-y-4"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success' && result.data?.allocationSaved) {
							toast.success('Allocation saved');
							await invalidateAll();
						}
					}}
			>
				<div class="flex flex-wrap items-start gap-4">
					<div class="w-72">
						<label class="label" for="allocation-method">Method</label>
						<select
							id="allocation-method"
							name="method"
							value={method}
							onchange={(e) => (chosenMethod = e.currentTarget.value)}
							class="input"
						>
							{#each ALLOCATION_METHODS as m (m)}
								<option value={m}>{ALLOCATION_METHOD_INFO[m].label}</option>
							{/each}
						</select>
						{#if errors?.method}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.method}</p>
						{:else}
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{methodInfo.description}</p>
						{/if}
					</div>
					<div class="min-w-64 flex-1">
						<label class="label" for="allocation-notes">Basis notes</label>
						<input
							id="allocation-notes"
							name="notes"
							value={notesValue}
							class="input"
							placeholder="Static factors this split assumes — lease terms, occupancy source, schedule"
						/>
						{#if errors?.notes}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes}</p>
						{/if}
					</div>
				</div>

				{#if method === 'fixed_percentage'}
					<fieldset class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
						<legend class="px-1 text-sm font-medium text-gray-900 dark:text-white">
							Fixed percentages
						</legend>
						{#if errors?.fixedPct}
							<p class="mb-2 text-sm text-red-600 dark:text-red-400">{errors.fixedPct}</p>
						{:else}
							<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">Must sum to 100%.</p>
						{/if}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each context.targets as t (t.buildingId)}
								<div>
									<label class="label" for="pct-{t.buildingId}">{t.label}</label>
									<input
										id="pct-{t.buildingId}"
										name="pct.{t.buildingId}"
										type="number"
										step="0.01"
										min="0"
										max="100"
										class="input"
										placeholder="0"
									/>
								</div>
							{/each}
						</div>
					</fieldset>
				{/if}

				<div class="flex flex-wrap gap-2">
					<button type="submit" formaction="?/previewAllocation" class="btn btn-secondary">
						Preview
					</button>
					<button type="submit" formaction="?/saveAllocation" class="btn btn-primary">
						{saved ? 'Replace saved allocation' : 'Save allocation'}
					</button>
					{#if saved}
						<button type="button" onclick={() => (removeModalOpen = true)} class="btn btn-danger">
							Remove
						</button>
					{/if}
				</div>
			</form>
		{/if}

		{#if context.warnings.length > 0 || shownWarnings.length > 0}
			<div
				class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
			>
				<p class="mb-1 font-semibold">Check before relying on this split</p>
				<ul class="list-inside list-disc space-y-0.5">
					{#each [...context.warnings, ...shownWarnings] as w (w)}
						<li>{w}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if shown}
			{#if isPreview}
				<p class="mb-2 text-sm font-medium text-amber-700 dark:text-amber-300">
					Preview — nothing has been saved yet.
				</p>
			{/if}
			<div class="overflow-x-auto">
				<table class="w-full text-sm" data-testid="allocation-table">
					<thead>
						<tr class="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
							<th class="py-2 pr-4">Building</th>
							<th class="py-2 pr-4 text-right">Basis</th>
							<th class="py-2 pr-4 text-right">Share</th>
							<th class="py-2 pr-4 text-right">Usage{unit ? ` (${unit})` : ''}</th>
							<th class="py-2 pr-4 text-right">Demand (kW)</th>
							<th class="py-2 pr-4 text-right">Energy $</th>
							<th class="py-2 pr-4 text-right">Demand $</th>
							<th class="py-2 pr-4 text-right">Fixed $</th>
							<th class="py-2 text-right">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each shown.lines as line (line.label)}
							<tr class={line.isRemainder ? 'bg-gray-50 dark:bg-gray-800' : ''}>
								<td class="py-2 pr-4 text-gray-900 dark:text-gray-100">
									{#if line.buildingId}
										<a
											href="/buildings/{line.buildingId}"
											class="text-blue-600 hover:underline dark:text-blue-400">{line.label}</a
										>
									{:else}
										<span class="italic">{line.label}</span>
									{/if}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{line.basisValue === null ? '—' : formatNumber(line.basisValue, 2)}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{n(line.sharePct).toFixed(2)}%
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{formatNumber(line.usage, 2)}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{formatNumber(line.demandKw, 2)}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{formatCurrency(line.energyCost)}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{formatCurrency(line.demandCost)}
								</td>
								<td class="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
									{formatCurrency(line.fixedCost)}
								</td>
								<td class="py-2 text-right font-medium text-gray-900 dark:text-white">
									{formatCurrency(line.totalCost)}
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="border-t-2 border-gray-300 font-semibold dark:border-gray-600">
							<td class="py-2 pr-4 text-gray-900 dark:text-white">Total</td>
							<td class="py-2 pr-4"></td>
							<td class="py-2 pr-4 text-right text-gray-900 dark:text-white">
								{sum(shown.lines, 'sharePct').toFixed(2)}%
							</td>
							<td class="py-2 pr-4 text-right text-gray-900 dark:text-white">
								{formatNumber(sum(shown.lines, 'usage'), 2)}
							</td>
							<td class="py-2 pr-4"></td>
							<td class="py-2 pr-4 text-right text-gray-900 dark:text-white">
								{formatCurrency(sum(shown.lines, 'energyCost'))}
							</td>
							<td class="py-2 pr-4 text-right text-gray-900 dark:text-white">
								{formatCurrency(sum(shown.lines, 'demandCost'))}
							</td>
							<td class="py-2 pr-4 text-right text-gray-900 dark:text-white">
								{formatCurrency(sum(shown.lines, 'fixedCost'))}
							</td>
							<td class="py-2 text-right text-gray-900 dark:text-white">
								{formatCurrency(sum(shown.lines, 'totalCost'))}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			{#if saved && !isPreview}
				<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
					Saved {new Date(saved.createdAt).toLocaleString('en-US')}{saved.notes
						? ` · ${saved.notes}`
						: ''}
				</p>
			{/if}
		{:else if canWrite}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Pick a method and preview the split before saving it.
			</p>
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				No allocation has been saved for this bill.
			</p>
		{/if}
	{/if}
</div>

<Modal bind:open={removeModalOpen} title="Remove Allocation">
	<p class="text-gray-700 dark:text-gray-300">
		Remove the saved allocation for this bill? The split will no longer appear on the buildings it
		covered.
	</p>

	{#snippet actions()}
		<button onclick={() => (removeModalOpen = false)} class="btn btn-secondary">Cancel</button>
		<form
			method="POST"
			action="?/deleteAllocation"
			use:enhance={() => {
				return async ({ result }) => {
					removeModalOpen = false;
					if (result.type === 'success') {
						toast.success('Allocation removed');
						await invalidateAll();
					} else {
						toast.error('Failed to remove allocation');
					}
				};
			}}
		>
			<input type="hidden" name="billId" value={billId} />
			<button type="submit" class="btn btn-danger">Remove</button>
		</form>
	{/snippet}
</Modal>
