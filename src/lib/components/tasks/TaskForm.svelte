<script lang="ts">
	import FormField from '$lib/components/forms/FormField.svelte';
	import { TASK_STATUSES, TASK_PRIORITIES } from '$lib/schemas/task';
	import { formatEnumLabel } from '$lib/schemas/utility';

	interface Props {
		values?: Record<string, string>;
		errors?: Record<string, string>;
		userOptions: { id: string; name: string }[];
		projectOptions: { id: string; name: string }[];
		clientOptions: { id: string; name: string }[];
		submitLabel: string;
		cancelHref: string;
		submitting?: boolean;
	}

	let {
		values = {},
		errors = {},
		userOptions,
		projectOptions,
		clientOptions,
		submitLabel,
		cancelHref,
		submitting = false
	}: Props = $props();
</script>

<div class="card space-y-4 p-6">
	<FormField label="Title" required error={errors.title}>
		<input
			name="title"
			value={values.title ?? ''}
			required
			class="input"
			placeholder="e.g., Review HVAC installation progress"
		/>
	</FormField>

	<FormField label="Description" error={errors.description}>
		<textarea name="description" rows="3" class="input">{values.description ?? ''}</textarea>
	</FormField>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Status" required error={errors.status}>
			<select name="status" class="input">
				{#each TASK_STATUSES as status (status)}
					<option value={status} selected={(values.status ?? 'todo') === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Priority" required error={errors.priority}>
			<select name="priority" class="input">
				{#each TASK_PRIORITIES as priority (priority)}
					<option value={priority} selected={(values.priority ?? 'medium') === priority}>
						{formatEnumLabel(priority)}
					</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Due Date" error={errors.dueDate}>
			<input name="dueDate" type="date" value={values.dueDate ?? ''} class="input" />
		</FormField>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<FormField label="Assigned To" error={errors.assignedTo}>
			<select name="assignedTo" class="input">
				<option value="" selected={!values.assignedTo}>Unassigned</option>
				{#each userOptions as u (u.id)}
					<option value={u.id} selected={values.assignedTo === u.id}>{u.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Project" error={errors.projectId}>
			<select name="projectId" class="input">
				<option value="" selected={!values.projectId}>None</option>
				{#each projectOptions as p (p.id)}
					<option value={p.id} selected={values.projectId === p.id}>{p.name}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Client" error={errors.clientId}>
			<select name="clientId" class="input">
				<option value="" selected={!values.clientId}>None</option>
				{#each clientOptions as c (c.id)}
					<option value={c.id} selected={values.clientId === c.id}>{c.name}</option>
				{/each}
			</select>
		</FormField>
	</div>

	<div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
		<a href={cancelHref} class="btn btn-secondary">Cancel</a>
		<button type="submit" disabled={submitting} class="btn btn-primary">
			{submitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</div>
