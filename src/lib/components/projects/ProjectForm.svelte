<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { PROJECT_STATUSES } from '$lib/schemas/project';
	import { formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		selectedBuildings?: string[];
		errors?: Record<string, string>;
		clientOptions: { id: string; name: string }[];
		buildingOptions: { id: string; name: string; clientId: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		selectedBuildings = [],
		errors = {},
		clientOptions,
		buildingOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedClient = $state(values.clientId ?? '');

	// Buildings narrow to the chosen client (JS enhancement; server validates regardless)
	let filteredBuildings = $derived(
		buildingOptions.filter((b) => !selectedClient || b.clientId === selectedClient)
	);
</script>

<div class="card space-y-6 p-6">
	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h2>
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Client" required error={errors.clientId}>
					<select name="clientId" required class="input" bind:value={selectedClient}>
						<option value="" disabled>Select client</option>
						{#each clientOptions as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Status" required error={errors.status}>
					<select name="status" class="input">
						{#each PROJECT_STATUSES as status (status)}
							<option value={status} selected={(values.status ?? 'planning') === status}>
								{formatEnumLabel(status)}
							</option>
						{/each}
					</select>
				</FormField>
			</div>

			<FormField label="Project Name" required error={errors.name}>
				<input
					name="name"
					value={values.name ?? ''}
					required
					class="input"
					placeholder="e.g., HVAC Upgrade - Science Hall"
				/>
			</FormField>

			<FormField label="Description" error={errors.description}>
				<textarea name="description" rows="3" class="input">{values.description ?? ''}</textarea>
			</FormField>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Schedule & Financials</h2>
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Start Date" error={errors.startDate}>
					<input name="startDate" type="date" value={values.startDate ?? ''} class="input" />
				</FormField>
				<FormField label="End Date" error={errors.endDate}>
					<input name="endDate" type="date" value={values.endDate ?? ''} class="input" />
				</FormField>
			</div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Budget ($)" error={errors.budget}>
					<input
						name="budget"
						type="number"
						min="0"
						step="any"
						value={values.budget ?? ''}
						class="input"
					/>
				</FormField>
				<FormField label="Actual Cost ($)" error={errors.actualCost}>
					<input
						name="actualCost"
						type="number"
						min="0"
						step="any"
						value={values.actualCost ?? ''}
						class="input"
					/>
				</FormField>
			</div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FormField label="Expected Annual Savings ($)" error={errors.expectedAnnualSavings}>
					<input
						name="expectedAnnualSavings"
						type="number"
						min="0"
						step="any"
						value={values.expectedAnnualSavings ?? ''}
						class="input"
					/>
				</FormField>
				<FormField label="Actual Annual Savings ($)" error={errors.actualAnnualSavings}>
					<input
						name="actualAnnualSavings"
						type="number"
						min="0"
						step="any"
						value={values.actualAnnualSavings ?? ''}
						class="input"
					/>
				</FormField>
				<FormField label="Simple Payback (years)" error={errors.roiYears}>
					<input
						name="roiYears"
						type="number"
						min="0"
						step="any"
						value={values.roiYears ?? ''}
						class="input"
					/>
				</FormField>
			</div>
		</div>
	</div>

	<fieldset>
		<legend class="label">Buildings in Scope</legend>
		{#if filteredBuildings.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{selectedClient
					? 'No buildings registered for this client yet.'
					: 'Select a client to choose buildings.'}
			</p>
		{:else}
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each filteredBuildings as b (b.id)}
					<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
						<input
							type="checkbox"
							name="buildingIds"
							value={b.id}
							checked={selectedBuildings.includes(b.id)}
							class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
						/>
						{b.name}
					</label>
				{/each}
			</div>
		{/if}
	</fieldset>

	<FormField label="Notes" error={errors.notes}>
		<textarea name="notes" rows="3" class="input">{values.notes ?? ''}</textarea>
	</FormField>

	<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
		<a href={cancelHref} class="btn btn-secondary">Cancel</a>
		<button type="submit" disabled={submitting} class="btn btn-primary">
			{submitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</div>
