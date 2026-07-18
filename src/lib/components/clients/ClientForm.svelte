<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { CLIENT_STATUSES } from '$lib/schemas/client';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let { values = {}, errors = {}, submitLabel, cancelHref, submitting = false }: Props = $props();

	function label(status: string) {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<div class="card space-y-6 p-6">
	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h2>
		<div class="space-y-4">
			<FormField label="Client Name" required error={errors.name}>
				<input
					name="name"
					value={values.name ?? ''}
					required
					class="input"
					placeholder="e.g., State University"
				/>
			</FormField>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Status" required error={errors.status}>
					<select name="status" class="input">
						{#each CLIENT_STATUSES as status (status)}
							<option value={status} selected={(values.status ?? 'active') === status}>
								{label(status)}
							</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Contact Name" error={errors.contactName}>
					<input
						name="contactName"
						value={values.contactName ?? ''}
						class="input"
						placeholder="Primary contact"
					/>
				</FormField>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField label="Contact Email" error={errors.contactEmail}>
					<input
						name="contactEmail"
						type="email"
						value={values.contactEmail ?? ''}
						class="input"
						placeholder="contact@university.edu"
					/>
				</FormField>
				<FormField label="Contact Phone" error={errors.contactPhone}>
					<input
						name="contactPhone"
						value={values.contactPhone ?? ''}
						class="input"
						placeholder="(555) 123-4567"
					/>
				</FormField>
			</div>
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Address</h2>
		<div class="space-y-4">
			<FormField label="Street Address" error={errors.address}>
				<input name="address" value={values.address ?? ''} class="input" />
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
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Contract</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<FormField label="Start Date" error={errors.contractStartDate}>
				<input
					name="contractStartDate"
					type="date"
					value={values.contractStartDate ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="End Date" error={errors.contractEndDate}>
				<input
					name="contractEndDate"
					type="date"
					value={values.contractEndDate ?? ''}
					class="input"
				/>
			</FormField>
			<FormField label="Contract Value ($)" error={errors.contractValue}>
				<input
					name="contractValue"
					type="number"
					min="0"
					step="any"
					value={values.contractValue ?? ''}
					class="input"
				/>
			</FormField>
		</div>
	</div>

	<FormField label="Notes" error={errors.notes}>
		<textarea name="notes" rows="4" class="input" placeholder="Additional information..."
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
