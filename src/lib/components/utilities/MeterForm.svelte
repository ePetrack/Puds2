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
		complexOptions: { id: string; name: string }[];
		parentMeterOptions: { id: string; meterNumber: string; utilityType: string }[];
		accountOptions: { id: string; accountNumber: string; utilityType: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		buildingOptions,
		complexOptions,
		parentMeterOptions,
		accountOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedType = $state(values.utilityType ?? '');
	// A meter's premise is either a building or a complex; seed from whichever is set.
	// svelte-ignore state_referenced_locally
	let premise = $state(values.complexId ? 'complex' : 'building');

	let filteredAccounts = $derived(
		accountOptions.filter((a) => !selectedType || a.utilityType === selectedType)
	);
	// Only meters of the same utility type can be a parent (submeter constraint).
	let filteredParents = $derived(
		parentMeterOptions.filter((m) => !selectedType || m.utilityType === selectedType)
	);
</script>

<div class="card space-y-6 p-6">
	<fieldset class="mb-4">
		<legend class="label">Premise <span class="text-red-500">*</span></legend>
		<div class="flex gap-4">
			<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
				<input type="radio" name="premise" value="building" bind:group={premise} />
				Single building
			</label>
			<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
				<input type="radio" name="premise" value="complex" bind:group={premise} />
				Complex (master meter)
			</label>
		</div>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			A meter serves a single building, or a complex (multiple buildings on one master meter).
		</p>
	</fieldset>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#if premise === 'complex'}
			<FormField label="Complex" required error={errors.buildingId}>
				<select name="complexId" required class="input">
					<option value="" disabled selected={!values.complexId}>Select complex</option>
					{#each complexOptions as c (c.id)}
						<option value={c.id} selected={values.complexId === c.id}>{c.name}</option>
					{/each}
				</select>
			</FormField>
		{:else}
			<FormField label="Building" required error={errors.buildingId}>
				<select name="buildingId" required class="input">
					<option value="" disabled selected={!values.buildingId}>Select building</option>
					{#each buildingOptions as b (b.id)}
						<option value={b.id} selected={values.buildingId === b.id}>{b.name}</option>
					{/each}
				</select>
			</FormField>
		{/if}
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

	<FormField
		label="Parent Meter"
		hint="Set a parent to make this a submeter; must match the utility type"
		error={errors.parentMeterId}
	>
		<select name="parentMeterId" class="input">
			<option value="" selected={!values.parentMeterId}>None (top-level meter)</option>
			{#each filteredParents as m (m.id)}
				<option value={m.id} selected={values.parentMeterId === m.id}>{m.meterNumber}</option>
			{/each}
		</select>
	</FormField>

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
