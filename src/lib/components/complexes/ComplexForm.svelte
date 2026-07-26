<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		clientOptions: { id: string; name: string }[];
		campusOptions?: { id: string; name: string; clientId: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		clientOptions,
		campusOptions = [],
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	let selectedClient = $state(values.clientId ?? '');
	let filteredCampuses = $derived(
		campusOptions.filter((c) => !selectedClient || c.clientId === selectedClient)
	);
</script>

<div class="card space-y-6 p-6">
	<div class="space-y-4">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Client" required error={errors.clientId}>
				<select name="clientId" required class="input" bind:value={selectedClient}>
					<option value="" disabled>Select a client</option>
					{#each clientOptions as client (client.id)}
						<option value={client.id}>{client.name}</option>
					{/each}
				</select>
			</FormField>
			<FormField label="Campus" hint="Optional parent campus" error={errors.campusId}>
				<select name="campusId" class="input">
					<option value="">None</option>
					{#each filteredCampuses as campus (campus.id)}
						<option value={campus.id} selected={values.campusId === campus.id}>{campus.name}</option
						>
					{/each}
				</select>
			</FormField>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField label="Complex Name" required error={errors.name}>
				<input
					name="name"
					value={values.name ?? ''}
					required
					class="input"
					placeholder="e.g., Central Plant District"
				/>
			</FormField>
			<FormField label="Code" hint="Optional short identifier" error={errors.code}>
				<input name="code" value={values.code ?? ''} class="input" placeholder="e.g., CPD" />
			</FormField>
		</div>

		<FormField
			label="Description"
			hint="What buildings/loads this complex serves"
			error={errors.description}
		>
			<textarea name="description" rows="2" class="input">{values.description ?? ''}</textarea>
		</FormField>
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
