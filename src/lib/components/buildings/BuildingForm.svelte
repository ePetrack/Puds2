<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { BUILDING_TYPES } from '$lib/schemas/building';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		clientOptions: { id: string; name: string }[];
		campusOptions?: { id: string; name: string; clientId: string }[];
		complexOptions?: { id: string; name: string; clientId: string; campusId: string | null }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		clientOptions,
		campusOptions = [],
		complexOptions = [],
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();

	// Campus/complex are optional and scoped to the chosen client.
	// svelte-ignore state_referenced_locally
	let selectedClient = $state(values.clientId ?? '');
	// svelte-ignore state_referenced_locally
	let selectedCampus = $state(values.campusId ?? '');

	let filteredCampuses = $derived(
		campusOptions.filter((c) => !selectedClient || c.clientId === selectedClient)
	);
	let filteredComplexes = $derived(
		complexOptions.filter(
			(c) =>
				(!selectedClient || c.clientId === selectedClient) &&
				(!selectedCampus || c.campusId === selectedCampus)
		)
	);

	function typeLabel(value: string) {
		return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<div class="card space-y-6 p-6">
	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h2>
		<div class="space-y-4">
			<FormField label="Client" required error={errors.clientId}>
				<select name="clientId" required class="input" bind:value={selectedClient}>
					<option value="" disabled>Select a client</option>
					{#each clientOptions as client (client.id)}
						<option value={client.id}>{client.name}</option>
					{/each}
				</select>
			</FormField>

			<FormField label="Building Name" required error={errors.name}>
				<input
					name="name"
					value={values.name ?? ''}
					required
					class="input"
					placeholder="e.g., Science Hall"
				/>
			</FormField>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField
					label="Campus"
					hint="Optional grouping within the client"
					error={errors.campusId}
				>
					<select name="campusId" class="input" bind:value={selectedCampus}>
						<option value="">None</option>
						{#each filteredCampuses as campus (campus.id)}
							<option value={campus.id} selected={values.campusId === campus.id}>
								{campus.name}
							</option>
						{/each}
					</select>
				</FormField>
				<FormField
					label="Complex"
					hint="Optional premise: buildings served by one meter"
					error={errors.complexId}
				>
					<select name="complexId" class="input">
						<option value="">None</option>
						{#each filteredComplexes as complex (complex.id)}
							<option value={complex.id} selected={values.complexId === complex.id}>
								{complex.name}
							</option>
						{/each}
					</select>
				</FormField>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Building Type" error={errors.buildingType}>
					<select name="buildingType" class="input">
						<option value="" selected={!values.buildingType}>Not specified</option>
						{#each BUILDING_TYPES as type (type)}
							<option value={type} selected={values.buildingType === type}>
								{typeLabel(type)}
							</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Year Built" error={errors.yearBuilt}>
					<input
						name="yearBuilt"
						type="number"
						min="1800"
						max={new Date().getFullYear()}
						value={values.yearBuilt ?? ''}
						class="input"
						placeholder="e.g., 1995"
					/>
				</FormField>
			</div>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Building Details</h2>
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<FormField label="Square Footage" error={errors.squareFootage}>
					<input
						name="squareFootage"
						type="number"
						min="0"
						value={values.squareFootage ?? ''}
						class="input"
						placeholder="e.g., 50000"
					/>
				</FormField>
				<FormField label="Floors" error={errors.floors}>
					<input
						name="floors"
						type="number"
						min="1"
						value={values.floors ?? ''}
						class="input"
						placeholder="e.g., 5"
					/>
				</FormField>
				<FormField label="Occupancy" error={errors.occupancy}>
					<input
						name="occupancy"
						type="number"
						min="0"
						value={values.occupancy ?? ''}
						class="input"
						placeholder="e.g., 500"
					/>
				</FormField>
			</div>

			<FormField label="Address" error={errors.address}>
				<input
					name="address"
					value={values.address ?? ''}
					class="input"
					placeholder="e.g., 123 Main St, City, State 12345"
				/>
			</FormField>
		</div>
	</div>

	<FormField label="Notes" error={errors.notes}>
		<textarea
			name="notes"
			rows="4"
			class="input"
			placeholder="Additional information about this building...">{values.notes ?? ''}</textarea
		>
	</FormField>

	<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
		<a href={cancelHref} class="btn btn-secondary">Cancel</a>
		<button type="submit" disabled={submitting} class="btn btn-primary">
			{submitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</div>
