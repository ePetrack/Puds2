<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { UTILITY_TYPES, ACCOUNT_STATUSES, formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		clientOptions: { id: string; name: string }[];
		providerOptions: { id: string; name: string }[];
		rateScheduleOptions: { id: string; name: string; providerId: string; utilityType: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		clientOptions,
		providerOptions,
		rateScheduleOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// Rate schedules narrow to the chosen provider/type once selected (JS enhancement;
	// without JS the full list is submitted and server validation still applies)
	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedProvider = $state(values.providerId ?? '');
	// svelte-ignore state_referenced_locally -- intentionally seeds local state from the prop
	let selectedType = $state(values.utilityType ?? '');

	let filteredRates = $derived(
		rateScheduleOptions.filter(
			(r) =>
				(!selectedProvider || r.providerId === selectedProvider) &&
				(!selectedType || r.utilityType === selectedType)
		)
	);
</script>

<div class="card space-y-6 p-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Client" required error={errors.clientId}>
			<select name="clientId" required class="input">
				<option value="" disabled selected={!values.clientId}>Select client</option>
				{#each clientOptions as c (c.id)}
					<option value={c.id} selected={values.clientId === c.id}>{c.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Provider" required error={errors.providerId}>
			<select name="providerId" required class="input" bind:value={selectedProvider}>
				<option value="" disabled>Select provider</option>
				{#each providerOptions as p (p.id)}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Account Number" required error={errors.accountNumber}>
			<input
				name="accountNumber"
				value={values.accountNumber ?? ''}
				required
				class="input"
				placeholder="e.g., 100-2345-678"
			/>
		</FormField>
		<FormField label="Utility Type" required error={errors.utilityType}>
			<select name="utilityType" required class="input" bind:value={selectedType}>
				<option value="" disabled>Select type</option>
				{#each UTILITY_TYPES as type (type)}
					<option value={type}>{formatEnumLabel(type)}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Status" required error={errors.status}>
			<select name="status" class="input">
				{#each ACCOUNT_STATUSES as status (status)}
					<option value={status} selected={(values.status ?? 'active') === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField
			label="Rate Schedule"
			hint="Filtered by provider and type"
			error={errors.rateScheduleId}
		>
			<select name="rateScheduleId" class="input">
				<option value="" selected={!values.rateScheduleId}>None</option>
				{#each filteredRates as r (r.id)}
					<option value={r.id} selected={values.rateScheduleId === r.id}>{r.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Service Address" error={errors.serviceAddress}>
			<input name="serviceAddress" value={values.serviceAddress ?? ''} class="input" />
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Service Start Date" error={errors.startDate}>
			<input name="startDate" type="date" value={values.startDate ?? ''} class="input" />
		</FormField>
		<FormField label="Service End Date" error={errors.endDate}>
			<input name="endDate" type="date" value={values.endDate ?? ''} class="input" />
		</FormField>
	</div>

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
