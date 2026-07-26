<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { toast } from '$lib/stores/toast';
	import { TASK_STATUSES, TASK_PRIORITIES } from '$lib/schemas/task';
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatDateShort } from '$lib/utils/format';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let taskToDelete = $state<{ id: string; title: string } | null>(null);

	function confirmDelete(task: { id: string; title: string }) {
		taskToDelete = task;
		deleteModalOpen = true;
	}

	const priorityColors: Record<string, string> = {
		low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
		medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		high: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};

	const statusColors: Record<string, string> = {
		todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
		in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};

	function isOverdue(task: { dueDate: string | null; status: string }) {
		return (
			task.dueDate &&
			['todo', 'in_progress'].includes(task.status) &&
			task.dueDate < new Date().toISOString().split('T')[0]
		);
	}
</script>

<svelte:head>
	<title>Tasks - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
			<p class="text-gray-600 dark:text-gray-400">Action items across clients and projects</p>
		</div>
		<a href="/tasks/new" class="btn btn-primary">+ Add Task</a>
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-44">
			<label class="label" for="status">Status</label>
			<select id="status" name="status" class="input">
				<option value="">Open (default)</option>
				<option value="all" selected={data.filters.status === 'all'}>All</option>
				{#each TASK_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<div class="w-40">
			<label class="label" for="priority">Priority</label>
			<select id="priority" name="priority" class="input">
				<option value="">All</option>
				{#each TASK_PRIORITIES as priority (priority)}
					<option value={priority} selected={data.filters.priority === priority}>
						{formatEnumLabel(priority)}
					</option>
				{/each}
			</select>
		</div>
		<div class="w-52">
			<label class="label" for="assignee">Assignee</label>
			<select id="assignee" name="assignee" class="input">
				<option value="">Anyone</option>
				{#each data.userOptions as u (u.id)}
					<option value={u.id} selected={data.filters.assignee === u.id}>{u.name}</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.tasks.total} task{data.tasks.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.tasks.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">✓</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
				<a href="/tasks/new" class="btn btn-primary mt-2 inline-block">+ Add Task</a>
			</div>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.tasks.items as task (task.id)}
					<li
						class="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						<div class="min-w-0 flex-1">
							<a
								href="/tasks/{task.id}/edit"
								class="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
							>
								{task.title}
							</a>
							<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
								{[
									task.projectName,
									task.clientName,
									task.assigneeName ? `→ ${task.assigneeName}` : null
								]
									.filter(Boolean)
									.join(' · ') || 'Unassigned'}
							</p>
						</div>

						{#if task.dueDate}
							<span
								class="text-sm {isOverdue(task)
									? 'font-semibold text-red-600 dark:text-red-400'
									: 'text-gray-600 dark:text-gray-400'}"
							>
								{isOverdue(task) ? 'Overdue: ' : 'Due '}{formatDateShort(task.dueDate)}
							</span>
						{/if}

						<span
							class="inline-flex rounded-full px-2 py-0.5 text-xs {priorityColors[task.priority]}"
						>
							{formatEnumLabel(task.priority)}
						</span>
						<span class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[task.status]}">
							{formatEnumLabel(task.status)}
						</span>

						<div class="flex items-center gap-2 text-sm font-medium">
							{#if task.status !== 'completed'}
								<form
									method="POST"
									action="?/setStatus"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												toast.success('Task completed');
												await invalidateAll();
											} else {
												toast.error('Failed to update task');
											}
										};
									}}
								>
									<input type="hidden" name="id" value={task.id} />
									<input type="hidden" name="status" value="completed" />
									<button
										type="submit"
										class="text-green-600 hover:text-green-800 dark:text-green-400"
										title="Mark completed"
									>
										✓ Done
									</button>
								</form>
							{/if}
							<a
								href="/tasks/{task.id}/edit"
								class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
							>
							<button
								onclick={() => confirmDelete(task)}
								class="text-red-600 hover:text-red-900 dark:text-red-400"
							>
								Delete
							</button>
						</div>
					</li>
				{/each}
			</ul>

			{#if data.tasks.totalPages > 1}
				<div
					class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Page {data.tasks.page} of {data.tasks.totalPages}
					</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Task">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{taskToDelete?.title}</strong>?
	</p>

	{#snippet actions()}
		<button onclick={() => (deleteModalOpen = false)} class="btn btn-secondary">Cancel</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return async ({ result }) => {
					deleteModalOpen = false;
					if (result.type === 'success') {
						toast.success('Task deleted');
						await invalidateAll();
					} else {
						toast.error('Failed to delete task');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={taskToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
