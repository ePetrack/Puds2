<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMonthYear } from '$lib/utils/format';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Import Degree Days - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/energy/degree-days"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Degree Days
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Import Degree Days from CSV</h1>
	</div>

	<div class="card space-y-4 p-6 text-sm text-gray-600 dark:text-gray-400">
		<p>
			Required columns: <strong>station, period, hdd, cdd</strong>. Optional:
			<strong>base_temp_f</strong>
			(assumed 65°F if the column is absent) and <strong>source</strong>. Periods are months —
			<code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">YYYY-MM</code>
			or
			<code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">YYYY-MM-DD</code>.
		</p>
		<p>
			A month is identified by station + period + base temperature. Re-importing a corrected series <strong
				>replaces</strong
			> those months rather than duplicating them, so it is safe to upload a revised file over an earlier
			one.
		</p>
		<p>
			Degree days are stored, never fetched at runtime — an allocation stays reproducible because
			its weather inputs can't change underneath it.
		</p>
		<a
			href="/templates/degree-days-template.csv"
			download
			class="inline-block text-primary-600 hover:underline dark:text-primary-400"
		>
			Download sample template
		</a>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="card space-y-4 p-6"
	>
		{#if form?.error}
			<div
				class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200"
				role="alert"
			>
				{form.error}
			</div>
		{/if}

		<div>
			<label class="label" for="file">CSV File</label>
			<input
				id="file"
				name="file"
				type="file"
				accept=".csv,text/csv"
				required
				class="block w-full text-sm text-gray-600 file:mr-4 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 dark:text-gray-400 dark:file:bg-primary-900 dark:file:text-primary-200"
			/>
		</div>

		<div class="flex justify-end gap-3">
			<a href="/energy/degree-days" class="btn btn-secondary">Cancel</a>
			<button type="submit" disabled={submitting} class="btn btn-primary">
				{submitting ? 'Importing...' : 'Import Degree Days'}
			</button>
		</div>
	</form>

	{#if form?.result}
		<div class="card space-y-4 p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Import Results</h2>
			<p class="text-sm text-gray-700 dark:text-gray-300">
				<span class="font-semibold text-green-600 dark:text-green-400">
					{form.result.inserted} added
				</span>
				{#if form.result.updated > 0}
					·
					<span class="font-semibold text-blue-600 dark:text-blue-400">
						{form.result.updated} replaced
					</span>
				{/if}
				{#if form.result.failures.length > 0}
					·
					<span class="font-semibold text-red-600 dark:text-red-400">
						{form.result.failures.length} issue{form.result.failures.length === 1 ? '' : 's'}
					</span>
				{/if}
			</p>

			{#if form.result.series.length > 0}
				<ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
					{#each form.result.series as series (series.station + series.baseTempF)}
						<li>
							<strong>{series.station}</strong> at {series.baseTempF}°F ·
							{formatMonthYear(series.firstPeriod)} – {formatMonthYear(series.lastPeriod)}
						</li>
					{/each}
				</ul>
			{/if}

			{#each form.result.notices as notice (notice)}
				<p
					class="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
				>
					{notice}
				</p>
			{/each}

			{#if form.result.failures.length > 0}
				<div
					class="max-h-64 space-y-1 overflow-y-auto rounded border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20"
				>
					{#each form.result.failures as failure (failure.line + failure.errors.join())}
						<p class="text-red-700 dark:text-red-300">
							{failure.line > 0 ? `Line ${failure.line}: ` : ''}{failure.errors.join('; ')}
						</p>
					{/each}
				</div>
			{/if}

			{#if form.result.inserted + form.result.updated > 0}
				<a href="/energy/degree-days" class="btn btn-primary inline-block">View Degree Days</a>
			{/if}
		</div>
	{/if}
</div>
