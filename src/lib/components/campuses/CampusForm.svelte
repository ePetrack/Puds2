<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		clientOptions: { id: string; name: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		clientOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();
</script>

<div class="card space-y-6 p-6">
	<div class="space-y-4">
		<FormField label="Client" required error={errors.clientId}>
			<select name="clientId" required class="input">
				<option value="" disabled selected={!values.clientId}>Select a client</option>
				{#each clientOptions as client (client.id)}
					<option value={client.id} selected={values.clientId === client.id}>{client.name}</option>
				{/each}
			</select>
		</FormField>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Campus Name" required error={errors.name}>
				<input
					name="name"
					value={values.name ?? ''}
					required
					class="input"
					placeholder="e.g., North Campus"
				/>
			</FormField>
			<FormField label="Code" hint="Optional short identifier" error={errors.code}>
				<input name="code" value={values.code ?? ''} class="input" placeholder="e.g., NC" />
			</FormField>
		</div>

		<FormField label="Address" error={errors.address}>
			<input
				name="address"
				value={values.address ?? ''}
				class="input"
				placeholder="e.g., 123 University Ave"
			/>
		</FormField>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<FormField label="City" error={errors.city}>
				<input name="city" value={values.city ?? ''} class="input" />
			</FormField>
			<FormField label="State" error={errors.state}>
				<input name="state" value={values.state ?? ''} class="input" />
			</FormField>
			<FormField label="ZIP" error={errors.zip}>
				<input name="zip" value={values.zip ?? ''} class="input" />
			</FormField>
		</div>
	</div>

	<FormField label="Notes" error={errors.notes}>
		<textarea name="notes" rows="3" class="input" placeholder="Additional information..."
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
