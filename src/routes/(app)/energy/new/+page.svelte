<script lang="ts">
	import { enhance } from '$app/forms';
	import FormField from '$lib/components/forms/FormField.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	let values = $derived(
		(form?.values ?? { meterId: data.preselectedMeter }) as Record<string, string>
	);
	let errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head>
	<title>Add Reading - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a
			href="/energy"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Energy Data
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Meter Reading</h1>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="card space-y-4 p-6"
	>
		<FormField label="Meter" required error={errors.meterId}>
			<select name="meterId" required class="input">
				<option value="" disabled selected={!values.meterId}>Select meter</option>
				{#each data.meterOptions as m (m.id)}
					<option value={m.id} selected={values.meterId === m.id}>{m.label}</option>
				{/each}
			</select>
		</FormField>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Reading Date" required error={errors.readingDate}>
				<input
					name="readingDate"
					type="date"
					required
					value={values.readingDate ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Usage" required error={errors.usage}>
				<input
					name="usage"
					type="number"
					min="0"
					step="any"
					required
					value={values.usage ?? ''}
					class="input"
					placeholder="e.g., 42500"
				/>
			</FormField>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<FormField label="Peak Demand (kW)" error={errors.demandKw}>
				<input
					name="demandKw"
					type="number"
					min="0"
					step="any"
					value={values.demandKw ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Cost ($)" error={errors.cost}>
				<input
					name="cost"
					type="number"
					min="0"
					step="any"
					value={values.cost ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Reading Type" error={errors.readingType}>
				<select name="readingType" class="input">
					<option value="actual" selected={(values.readingType ?? 'actual') === 'actual'}
						>Actual</option
					>
					<option value="estimated" selected={values.readingType === 'estimated'}>Estimated</option>
				</select>
			</FormField>
		</div>

		<FormField label="Notes" error={errors.notes}>
			<textarea name="notes" rows="2" class="input">{values.notes ?? ''}</textarea>
		</FormField>

		<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
			<a href="/energy" class="btn btn-secondary">Cancel</a>
			<button type="submit" disabled={submitting} class="btn btn-primary">
				{submitting ? 'Saving...' : 'Add Reading'}
			</button>
		</div>
	</form>
</div>
