<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { BILL_STATUSES, formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		accountOptions: { id: string; label: string }[];
		meterOptions: { id: string; meterNumber: string; accountId: string | null }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		accountOptions,
		meterOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedAccount = $state(values.accountId ?? '');

	let filteredMeters = $derived(
		meterOptions.filter(
			(m) => !selectedAccount || m.accountId === selectedAccount || m.id === values.meterId
		)
	);

	// Live reconciliation of itemized charges against the entered total
	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let charges = $state({
		energyCharge: values.energyCharge ?? '',
		demandCharge: values.demandCharge ?? '',
		fixedCharge: values.fixedCharge ?? '',
		taxesFees: values.taxesFees ?? '',
		otherCharges: values.otherCharges ?? '',
		totalCost: values.totalCost ?? ''
	});

	let chargesSum = $derived.by(() => {
		const parts = [
			charges.energyCharge,
			charges.demandCharge,
			charges.fixedCharge,
			charges.taxesFees,
			charges.otherCharges
		]
			.filter((v) => v !== '')
			.map(Number)
			.filter((n) => !isNaN(n));
		return parts.length > 0 ? parts.reduce((s, n) => s + n, 0) : null;
	});

	let chargesMismatch = $derived(
		chargesSum !== null &&
			charges.totalCost !== '' &&
			!isNaN(Number(charges.totalCost)) &&
			Math.abs(chargesSum - Number(charges.totalCost)) > 0.01
	);
</script>

<div class="card space-y-6 p-6">
	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Account</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Utility Account" required error={errors.accountId}>
				<select name="accountId" required class="input" bind:value={selectedAccount}>
					<option value="" disabled>Select account</option>
					{#each accountOptions as a (a.id)}
						<option value={a.id}>{a.label}</option>
					{/each}
				</select>
			</FormField>
			<FormField label="Meter" hint="Optional, filtered by account" error={errors.meterId}>
				<select name="meterId" class="input">
					<option value="" selected={!values.meterId}>None</option>
					{#each filteredMeters as m (m.id)}
						<option value={m.id} selected={values.meterId === m.id}>{m.meterNumber}</option>
					{/each}
				</select>
			</FormField>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Billing Period</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<FormField label="Statement Date" required error={errors.statementDate}>
				<input
					name="statementDate"
					type="date"
					required
					value={values.statementDate ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Period Start" required error={errors.periodStart}>
				<input
					name="periodStart"
					type="date"
					required
					value={values.periodStart ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Period End" required error={errors.periodEnd}>
				<input name="periodEnd" type="date" required value={values.periodEnd ?? ''} class="input" />
			</FormField>
			<FormField label="Due Date" error={errors.dueDate}>
				<input name="dueDate" type="date" value={values.dueDate ?? ''} class="input" />
			</FormField>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Usage</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<FormField label="Usage" error={errors.usage}>
				<input
					name="usage"
					type="number"
					min="0"
					step="any"
					value={values.usage ?? ''}
					class="input"
					placeholder="e.g., 42500"
				/>
			</FormField>
			<FormField label="Unit" hint="e.g., kWh, therms" error={errors.unit}>
				<input name="unit" value={values.unit ?? ''} class="input" placeholder="e.g., kWh" />
			</FormField>
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
			<FormField label="Reading Type" error={errors.readingType}>
				<select name="readingType" class="input">
					<option value="" selected={!values.readingType}>Not specified</option>
					<option value="actual" selected={values.readingType === 'actual'}>Actual</option>
					<option value="estimated" selected={values.readingType === 'estimated'}>Estimated</option>
				</select>
			</FormField>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Charges</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<FormField label="Energy Charge ($)" error={errors.energyCharge}>
				<input
					name="energyCharge"
					type="number"
					min="0"
					step="any"
					bind:value={charges.energyCharge}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
			<FormField label="Demand Charge ($)" error={errors.demandCharge}>
				<input
					name="demandCharge"
					type="number"
					min="0"
					step="any"
					bind:value={charges.demandCharge}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
			<FormField label="Fixed Charge ($)" error={errors.fixedCharge}>
				<input
					name="fixedCharge"
					type="number"
					min="0"
					step="any"
					bind:value={charges.fixedCharge}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
			<FormField label="Taxes & Fees ($)" error={errors.taxesFees}>
				<input
					name="taxesFees"
					type="number"
					min="0"
					step="any"
					bind:value={charges.taxesFees}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
			<FormField label="Other Charges ($)" error={errors.otherCharges}>
				<input
					name="otherCharges"
					type="number"
					min="0"
					step="any"
					bind:value={charges.otherCharges}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
			<FormField label="Total Cost ($)" required error={errors.totalCost}>
				<input
					name="totalCost"
					type="number"
					min="0"
					step="any"
					required
					bind:value={charges.totalCost}
					class="input"
					placeholder="0.00"
				/>
			</FormField>
		</div>
		{#if chargesSum !== null}
			<p
				class="mt-1 text-sm {chargesMismatch
					? 'text-amber-600 dark:text-amber-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				Line items sum to ${chargesSum.toFixed(2)}{chargesMismatch
					? ' — does not match the total cost'
					: ''}
			</p>
		{/if}
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Status</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Bill Status" required error={errors.status}>
				<select name="status" class="input">
					{#each BILL_STATUSES as status (status)}
						<option value={status} selected={(values.status ?? 'pending') === status}>
							{formatEnumLabel(status)}
						</option>
					{/each}
				</select>
			</FormField>
			<FormField label="Payment Date" error={errors.paymentDate}>
				<input name="paymentDate" type="date" value={values.paymentDate ?? ''} class="input" />
			</FormField>
		</div>
	</div>

	<FormField label="Notes" error={errors.notes}>
		<textarea name="notes" rows="3" class="input" placeholder="Anything unusual about this bill..."
			>{values.notes ?? ''}</textarea
		>
	</FormField>

	<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
		<a href={cancelHref} class="btn btn-secondary">Cancel</a>
		<button type="submit" disabled={submitting} class="btn btn-primary">
			{submitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</div>
