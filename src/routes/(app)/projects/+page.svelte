<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';
	import { PROJECT_STATUSES } from '$lib/schemas/project';
	import { formatEnumLabel } from '$lib/schemas/utility';
	import { formatCurrency } from '$lib/utils/format';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let projectToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(project: { id: string; name: string }) {
		projectToDelete = project;
		deleteModalOpen = true;
	}

	const statusColors: Record<string, string> = {
		planning: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
		approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		on_hold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
		cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};
</script>

<svelte:head>
	<title>Projects - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
			<p class="text-gray-600 dark:text-gray-400">Energy projects, budgets, and savings</p>
		</div>
		<a href="/projects/new" class="btn btn-primary">+ Add Project</a>
	</div>

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-64">
			<label class="label" for="search">Search</label>
			<input
				id="search"
				name="search"
				value={data.filters.search}
				class="input"
				placeholder="Project name"
			/>
		</div>
		<div class="w-56">
			<label class="label" for="client">Client</label>
			<select id="client" name="client" class="input">
				<option value="">All clients</option>
				{#each data.clientOptions as c (c.id)}
					<option value={c.id} selected={data.filters.client === c.id}>{c.name}</option>
				{/each}
			</select>
		</div>
		<div class="w-44">
			<label class="label" for="status">Status</label>
			<select id="status" name="status" class="input">
				<option value="">All statuses</option>
				{#each PROJECT_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.projects.total} project{data.projects.total === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.projects.items.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">📋</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No projects found</h3>
				<a href="/projects/new" class="btn btn-primary mt-2 inline-block">+ Add Project</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Name</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Client</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Status</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Budget</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Expected Savings/yr</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Buildings</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.projects.items as project (project.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<a
										href="/projects/{project.id}"
										class="font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
									>
										{project.name}
									</a>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{project.clientName ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
											project.status
										]}"
									>
										{formatEnumLabel(project.status)}
									</span>
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatCurrency(project.budget)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{formatCurrency(project.expectedAnnualSavings)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100"
								>
									{project.buildingCount}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/projects/{project.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">View</a
										>
										<a
											href="/projects/{project.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(project)}
											class="text-red-600 hover:text-red-900 dark:text-red-400">Delete</button
										>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				page={data.projects.page}
				totalPages={data.projects.totalPages}
				basePath="/projects"
				filters={data.filters}
			/>
		{/if}
	</div>
</div>

<ConfirmDelete
	bind:open={deleteModalOpen}
	title="Delete Project"
	entity="Project"
	id={projectToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{projectToDelete?.name}</strong>? This action cannot be
		undone.
	</p>
</ConfirmDelete>
