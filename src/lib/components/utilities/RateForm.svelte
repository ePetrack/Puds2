<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { UTILITY_TYPES, RATE_TYPES, formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		providerOptions: { id: string; name: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		providerOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();
</script>

<div class="card space-y-6 p-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Provider" required error={errors.providerId}>
			<select name="providerId" required class="input">
				<option value="" disabled selected={!values.providerId}>Select provider</option>
				{#each providerOptions as p (p.id)}
					<option value={p.id} selected={values.providerId === p.id}>{p.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Schedule Name" required error={errors.name}>
			<input
				name="name"
				value={values.name ?? ''}
				required
				class="input"
				placeholder="e.g., GS-2 General Service"
			/>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Utility Type" required error={errors.utilityType}>
			<select name="utilityType" required class="input">
				<option value="" disabled selected={!values.utilityType}>Select type</option>
				{#each UTILITY_TYPES as type (type)}
					<option value={type} selected={values.utilityType === type}>
						{formatEnumLabel(type)}
					</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Rate Structure" required error={errors.rateType}>
			<select name="rateType" required class="input">
				<option value="" disabled selected={!values.rateType}>Select structure</option>
				{#each RATE_TYPES as type (type)}
					<option value={type} selected={values.rateType === type}>{formatEnumLabel(type)}</option>
				{/each}
			</select>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Energy Rate ($/unit)" hint="Blended or base rate" error={errors.energyRate}>
			<input
				name="energyRate"
				type="number"
				min="0"
				step="any"
				value={values.energyRate ?? ''}
				class="input"
				placeholder="e.g., 0.115"
			/>
		</FormField>
		<FormField label="Demand Rate ($/kW)" error={errors.demandRate}>
			<input
				name="demandRate"
				type="number"
				min="0"
				step="any"
				value={values.demandRate ?? ''}
				class="input"
				placeholder="e.g., 12.50"
			/>
		</FormField>
		<FormField label="Fixed Monthly Charge ($)" error={errors.fixedMonthlyCharge}>
			<input
				name="fixedMonthlyCharge"
				type="number"
				min="0"
				step="any"
				value={values.fixedMonthlyCharge ?? ''}
				class="input"
				placeholder="e.g., 45.00"
			/>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Billing Unit" hint="e.g., kWh, therms, kGal" error={errors.unit}>
			<input name="unit" value={values.unit ?? ''} class="input" placeholder="e.g., kWh" />
		</FormField>
		<FormField label="Effective Date" error={errors.effectiveDate}>
			<input name="effectiveDate" type="date" value={values.effectiveDate ?? ''} class="input" />
		</FormField>
		<FormField label="End Date" error={errors.endDate}>
			<input name="endDate" type="date" value={values.endDate ?? ''} class="input" />
		</FormField>
	</div>

	<FormField label="Notes" hint="Tier breakpoints, TOU windows, riders, etc." error={errors.notes}>
		<textarea name="notes" rows="3" class="input">{values.notes ?? ''}</textarea>
	</FormField>

	<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
		<a href={cancelHref} class="btn btn-secondary">Cancel</a>
		<button type="submit" disabled={submitting} class="btn btn-primary">
			{submitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</div>
