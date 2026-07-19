<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Import Bills - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/bills"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Bills
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Import Bills from CSV</h1>
	</div>

	<div class="card space-y-4 p-6 text-sm text-gray-600 dark:text-gray-400">
		<p>
			Rows are matched to accounts by
			<code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">account_number</code>.
			Valid rows are imported; invalid rows are skipped and reported below.
		</p>
		<p>
			Required columns: <strong
				>account_number, statement_date, period_start, period_end, total_cost</strong
			>. Optional: due_date, usage, unit, demand_kw, energy_charge, demand_charge, fixed_charge,
			taxes_fees, other_charges, status, reading_type, notes. Dates are YYYY-MM-DD.
		</p>
		<a
			href="/templates/utility-bills-template.csv"
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
			<a href="/utilities/bills" class="btn btn-secondary">Cancel</a>
			<button type="submit" disabled={submitting} class="btn btn-primary">
				{submitting ? 'Importing...' : 'Import Bills'}
			</button>
		</div>
	</form>

	{#if form?.result}
		<div class="card space-y-4 p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Import Results</h2>
			<p class="text-sm text-gray-700 dark:text-gray-300">
				<span class="font-semibold text-green-600 dark:text-green-400">
					{form.result.imported} imported
				</span>
				{#if form.result.failures.length > 0}
					·
					<span class="font-semibold text-red-600 dark:text-red-400">
						{form.result.failures.length} skipped
					</span>
				{/if}
			</p>

			{#if form.result.failures.length > 0}
				<div
					class="max-h-64 space-y-1 overflow-y-auto rounded border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20"
				>
					{#each form.result.failures as failure (failure.line)}
						<p class="text-red-700 dark:text-red-300">
							Line {failure.line}: {failure.errors.join('; ')}
						</p>
					{/each}
				</div>
			{/if}

			{#if form.result.imported > 0}
				<a href="/utilities/bills" class="btn btn-primary inline-block">View Imported Bills</a>
			{/if}
		</div>
	{/if}
</div>
