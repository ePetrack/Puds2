<script lang="ts">
  import { pb, type Project } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let projects = $state<any[]>([]);
  let loading = $state(true);
  let deleteModalOpen = $state(false);
  let projectToDelete = $state<any | null>(null);

  onMount(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    try {
      loading = true;
      if (!pb) return;
      projects = await pb.collection('projects').getFullList({
        sort: '-created',
        expand: 'client',
      });
    } catch (error: any) {
      toast.error('Failed to load projects: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function handleDelete(project: any) {
    projectToDelete = project;
    deleteModalOpen = true;
  }

  async function confirmDelete() {
    if (!pb || !projectToDelete) return;

    try {
      await pb.collection('projects').delete(projectToDelete.id);
      toast.success('Project deleted successfully');
      deleteModalOpen = false;
      projectToDelete = null;
      await loadProjects();
    } catch (error: any) {
      toast.error('Failed to delete project: ' + error.message);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'approved':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'on_hold':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }
</script>

<svelte:head>
  <title>Projects - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Projects
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Manage energy management projects and initiatives
      </p>
    </div>
    <a href="/projects/new" class="btn btn-primary">
      + Add Project
    </a>
  </div>

  <!-- Projects Table -->
  <div class="card overflow-hidden">
    {#if loading}
      <div class="p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
      </div>
    {:else if projects.length === 0}
      <div class="p-12 text-center">
        <p class="text-xl text-gray-600 dark:text-gray-400 mb-4">No projects yet</p>
        <a href="/projects/new" class="btn btn-primary">
          Create your first project
        </a>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Budget
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expected Savings
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ROI
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {#each projects as project}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4">
                  <a
                    href="/projects/{project.id}"
                    class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    {project.name}
                  </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if project.expand?.client}
                    <a href="/clients/{project.client}" class="hover:text-primary-600 dark:hover:text-primary-400">
                      {project.expand.client.name}
                    </a>
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(project.status)}">
                    {project.status.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if project.budget}
                    ${project.budget.toLocaleString()}
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if project.expected_annual_savings}
                    ${project.expected_annual_savings.toLocaleString()}/yr
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if project.roi_years}
                    {project.roi_years} years
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-2">
                    <a
                      href="/projects/{project.id}"
                      class="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      title="View"
                    >
                      View
                    </a>
                    <a
                      href="/projects/{project.id}/edit"
                      class="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Edit"
                    >
                      Edit
                    </a>
                    <button
                      onclick={() => handleDelete(project)}
                      class="text-red-600 hover:text-red-700 dark:text-red-400"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title="Delete Project">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{projectToDelete?.name}</strong>?
    This action cannot be undone.
  </p>

  {#snippet actions()}
    <button
      onclick={() => deleteModalOpen = false}
      class="btn btn-secondary"
    >
      Cancel
    </button>
    <button
      onclick={confirmDelete}
      class="btn btn-danger"
    >
      Delete
    </button>
  {/snippet}
</Modal>
