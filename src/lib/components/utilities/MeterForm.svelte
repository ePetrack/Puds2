<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import {
		UTILITY_TYPES,
		METER_UNITS,
		METER_STATUSES,
		formatEnumLabel
	} from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		buildingOptions: { id: string; name: string }[];
		accountOptions: { id: string; accountNumber: string; utilityType: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		buildingOptions,
		accountOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedType = $state(values.utilityType ?? '');

	let filteredAccounts = $derived(
		accountOptions.filter((a) => !selectedType || a.utilityType === selectedType)
	);
</script>

<div class="card space-y-6 p-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Building" required error={errors.buildingId}>
			<select name="buildingId" required class="input">
				<option value="" disabled selected={!values.buildingId}>Select building</option>
				{#each buildingOptions as b (b.id)}
					<option value={b.id} selected={values.buildingId === b.id}>{b.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Meter Number" required error={errors.meterNumber}>
			<input
				name="meterNumber"
				value={values.meterNumber ?? ''}
				required
				class="input"
				placeholder="e.g., MTR-04521"
			/>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Utility Type" required error={errors.utilityType}>
			<select name="utilityType" required class="input" bind:value={selectedType}>
				<option value="" disabled>Select type</option>
				{#each UTILITY_TYPES as type (type)}
					<option value={type}>{formatEnumLabel(type)}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Unit" required error={errors.unit}>
			<select name="unit" required class="input">
				<option value="" disabled selected={!values.unit}>Select unit</option>
				{#each METER_UNITS as unit (unit)}
					<option value={unit} selected={values.unit === unit}>{formatEnumLabel(unit)}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Status" required error={errors.status}>
			<select name="status" class="input">
				{#each METER_STATUSES as status (status)}
					<option value={status} selected={(values.status ?? 'active') === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Utility Account" hint="Filtered by utility type" error={errors.accountId}>
			<select name="accountId" class="input">
				<option value="" selected={!values.accountId}>None</option>
				{#each filteredAccounts as a (a.id)}
					<option value={a.id} selected={values.accountId === a.id}>{a.accountNumber}</option>
				{/each}
			</select>
		</FormField>
		<FormField
			label="Multiplier"
			hint="Reading multiplier, if applicable"
			error={errors.multiplier}
		>
			<input
				name="multiplier"
				type="number"
				min="0"
				step="any"
				value={values.multiplier ?? ''}
				class="input"
				placeholder="e.g., 1"
			/>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Install Date" error={errors.installDate}>
			<input name="installDate" type="date" value={values.installDate ?? ''} class="input" />
		</FormField>
		<FormField label="Location" error={errors.location}>
			<input
				name="location"
				value={values.location ?? ''}
				class="input"
				placeholder="e.g., Basement mechanical room"
			/>
		</FormField>
	</div>

	<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
		<input
			type="checkbox"
			name="isSubmeter"
			checked={values.isSubmeter === 'true'}
			class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
		/>
		This is a submeter (not directly billed by the provider)
	</label>

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
