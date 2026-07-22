<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { UTILITY_TYPES, formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		selectedTypes?: string[];
		errors?: Record<string, string>;
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		selectedTypes = [],
		errors = {},
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();
</script>

<div class="card space-y-6 p-6">
	<FormField label="Provider Name" required error={errors.name}>
		<input
			name="name"
			value={values.name ?? ''}
			required
			class="input"
			placeholder="e.g., City Power & Light"
		/>
	</FormField>

	<fieldset>
		<legend class="label">Utility Types Supplied</legend>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each UTILITY_TYPES as type (type)}
				<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
					<input
						type="checkbox"
						name="utilityTypes"
						value={type}
						checked={selectedTypes.includes(type)}
						class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
					/>
					{formatEnumLabel(type)}
				</label>
			{/each}
		</div>
	</fieldset>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Account Manager" error={errors.accountManager}>
			<input name="accountManager" value={values.accountManager ?? ''} class="input" />
		</FormField>
		<FormField label="Phone" error={errors.phone}>
			<input name="phone" value={values.phone ?? ''} class="input" placeholder="(555) 123-4567" />
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField label="Email" error={errors.email}>
			<input
				name="email"
				type="email"
				value={values.email ?? ''}
				class="input"
				placeholder="accounts@provider.com"
			/>
		</FormField>
		<FormField label="Website" error={errors.website}>
			<input
				name="website"
				value={values.website ?? ''}
				class="input"
				placeholder="https://provider.com"
			/>
		</FormField>
	</div>

	<FormField label="Address" error={errors.address}>
		<input name="address" value={values.address ?? ''} class="input" />
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
