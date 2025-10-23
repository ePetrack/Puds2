<script lang="ts">
  import { pb, type Project } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let project = $state<any | null>(null);
  let loading = $state(true);
  let deleteModalOpen = $state(false);

  const projectId = $page.params.id as string;

  onMount(async () => {
    await loadProject();
  });

  async function loadProject() {
    try {
      loading = true;
      if (!pb) return;

      // Load project with client info
      project = await pb.collection('projects').getOne(projectId, {
        expand: 'client',
      });
    } catch (error: any) {
      toast.error('Failed to load project: ' + error.message);
      goto('/projects');
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!pb || !project) return;

    try {
      await pb.collection('projects').delete(project.id);
      toast.success('Project deleted successfully');
      goto('/projects');
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

  function calculateProgress(project: any): number {
    if (!project.budget || !project.actual_cost) return 0;
    return Math.min(100, (project.actual_cost / project.budget) * 100);
  }
</script>

<svelte:head>
  <title>{project?.name || 'Project'} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  {:else if project}
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <a href="/projects" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          ← Back to Projects
        </a>
      </div>
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {project.name}
          </h1>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 text-sm font-semibold rounded-full {getStatusColor(project.status)}">
              {project.status.replace('_', ' ')}
            </span>
            {#if project.expand?.client}
              <a href="/clients/{project.client}" class="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                {project.expand.client.name}
              </a>
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/projects/{project.id}/edit" class="btn btn-secondary">
            Edit
          </a>
          <button onclick={() => deleteModalOpen = true} class="btn btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Details -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Description -->
        {#if project.description}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Description
            </h2>
            <div class="prose dark:prose-invert max-w-none text-gray-900 dark:text-white">
              {project.description}
            </div>
          </div>
        {/if}

        <!-- Timeline -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Timeline
          </h2>
          <dl class="grid grid-cols-2 gap-4">
            {#if project.start_date}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">
                  {new Date(project.start_date).toLocaleDateString()}
                </dd>
              </div>
            {/if}
            {#if project.end_date}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">
                  {new Date(project.end_date).toLocaleDateString()}
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Financial Overview -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Financial Overview
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#if project.budget}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</dt>
                <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  ${project.budget.toLocaleString()}
                </dd>
              </div>
            {/if}
            {#if project.actual_cost}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Cost</dt>
                <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  ${project.actual_cost.toLocaleString()}
                </dd>
                {#if project.budget}
                  <dd class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {((project.actual_cost / project.budget) * 100).toFixed(1)}% of budget
                  </dd>
                {/if}
              </div>
            {/if}
            {#if project.expected_annual_savings}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Annual Savings</dt>
                <dd class="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                  ${project.expected_annual_savings.toLocaleString()}/year
                </dd>
              </div>
            {/if}
            {#if project.actual_annual_savings}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Annual Savings</dt>
                <dd class="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                  ${project.actual_annual_savings.toLocaleString()}/year
                </dd>
              </div>
            {/if}
          </div>

          <!-- Budget Progress Bar -->
          {#if project.budget && project.actual_cost}
            <div class="mt-6">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-gray-600 dark:text-gray-400">Budget Progress</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {calculateProgress(project).toFixed(1)}%
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all"
                  class:bg-green-500={calculateProgress(project) <= 75}
                  class:bg-yellow-500={calculateProgress(project) > 75 && calculateProgress(project) <= 90}
                  class:bg-red-500={calculateProgress(project) > 90}
                  style="width: {calculateProgress(project)}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column - Summary -->
      <div class="space-y-6">
        <!-- ROI Card -->
        {#if project.roi_years}
          <div class="card p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
              Return on Investment
            </h3>
            <p class="text-3xl font-bold text-green-900 dark:text-green-300">
              {project.roi_years} years
            </p>
            <p class="text-sm text-green-700 dark:text-green-400 mt-1">
              Payback period
            </p>
          </div>
        {/if}

        <!-- Client Info -->
        {#if project.expand?.client}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Client
            </h2>
            <a href="/clients/{project.client}" class="block hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors -m-3">
              <h3 class="font-medium text-primary-600 dark:text-primary-400">
                {project.expand.client.name}
              </h3>
              {#if project.expand.client.city && project.expand.client.state}
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {project.expand.client.city}, {project.expand.client.state}
                </p>
              {/if}
            </a>
          </div>
        {/if}

        <!-- Quick Stats -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Stats
          </h2>
          <dl class="space-y-3">
            <div class="flex items-center justify-between">
              <dt class="text-sm text-gray-600 dark:text-gray-400">Status</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {project.status.replace('_', ' ')}
              </dd>
            </div>
            {#if project.start_date}
              <div class="flex items-center justify-between">
                <dt class="text-sm text-gray-600 dark:text-gray-400">Duration</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">
                  {#if project.end_date}
                    {Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                  {:else}
                    Ongoing
                  {/if}
                </dd>
              </div>
            {/if}
            <div class="flex items-center justify-between">
              <dt class="text-sm text-gray-600 dark:text-gray-400">Created</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(project.created).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title="Delete Project">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{project?.name}</strong>?
    This action cannot be undone.
  </p>

  {#snippet actions()}
    <button onclick={() => deleteModalOpen = false} class="btn btn-secondary">
      Cancel
    </button>
    <button onclick={handleDelete} class="btn btn-danger">
      Delete
    </button>
  {/snippet}
</Modal>
