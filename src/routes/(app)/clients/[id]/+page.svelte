<script lang="ts">
  import { pb, type Client, type Building, type Project } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let client = $state<Client | null>(null);
  let buildings = $state<Building[]>([]);
  let projects = $state<Project[]>([]);
  let loading = $state(true);
  let deleteModalOpen = $state(false);

  const clientId = $page.params.id as string;

  onMount(async () => {
    await loadClient();
  });

  async function loadClient() {
    try {
      loading = true;
      if (!pb) return;

      // Load client
      client = await pb.collection('clients').getOne(clientId, {
        expand: 'user',
      });

      // Load related buildings
      buildings = await pb.collection('buildings').getFullList({
        filter: `client = "${clientId}"`,
        sort: '-created',
      });

      // Load related projects
      projects = await pb.collection('projects').getFullList({
        filter: `client = "${clientId}"`,
        sort: '-created',
      });
    } catch (error: any) {
      toast.error('Failed to load client: ' + error.message);
      goto('/clients');
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!pb || !client) return;

    try {
      await pb.collection('clients').delete(client.id);
      toast.success('Client deleted successfully');
      goto('/clients');
    } catch (error: any) {
      toast.error('Failed to delete client: ' + error.message);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'prospective':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  function getProjectStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
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
  <title>{client?.name || 'Client'} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  {:else if client}
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <a href="/clients" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          ← Back to Clients
        </a>
      </div>
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {client.name}
          </h1>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 text-sm font-semibold rounded-full {getStatusColor(client.status)}">
              {client.status}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/clients/{client.id}/edit" class="btn btn-secondary">
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
        <!-- Contact Information -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h2>
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if client.contact_name}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Name</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">{client.contact_name}</dd>
              </div>
            {/if}
            {#if client.contact_email}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd class="mt-1">
                  <a href="mailto:{client.contact_email}" class="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                    {client.contact_email}
                  </a>
                </dd>
              </div>
            {/if}
            {#if client.contact_phone}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                <dd class="mt-1">
                  <a href="tel:{client.contact_phone}" class="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                    {client.contact_phone}
                  </a>
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Address -->
        {#if client.address || client.city || client.state || client.zip}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Address
            </h2>
            <address class="not-italic text-gray-900 dark:text-white">
              {#if client.address}
                <div>{client.address}</div>
              {/if}
              {#if client.city || client.state || client.zip}
                <div>
                  {client.city}{client.city && (client.state || client.zip) ? ',' : ''}
                  {client.state} {client.zip}
                </div>
              {/if}
            </address>
          </div>
        {/if}

        <!-- Buildings -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Buildings ({buildings.length})
            </h2>
            <a href="/buildings/new?client={client.id}" class="btn btn-secondary btn-sm">
              + Add Building
            </a>
          </div>
          {#if buildings.length > 0}
            <div class="space-y-3">
              {#each buildings as building}
                <a
                  href="/buildings/{building.id}"
                  class="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="font-medium text-gray-900 dark:text-white">{building.name}</h3>
                      <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {#if building.building_type}
                          <span class="capitalize">{building.building_type.replace('_', ' ')}</span>
                        {/if}
                        {#if building.square_footage}
                          • {building.square_footage.toLocaleString()} sq ft
                        {/if}
                        {#if building.year_built}
                          • Built {building.year_built}
                        {/if}
                      </div>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 dark:text-gray-400 text-center py-8">
              No buildings yet. <a href="/buildings/new?client={client.id}" class="text-primary-600 hover:text-primary-700">Add the first building</a>
            </p>
          {/if}
        </div>

        <!-- Projects -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Projects ({projects.length})
            </h2>
            <a href="/projects/new?client={client.id}" class="btn btn-secondary btn-sm">
              + Add Project
            </a>
          </div>
          {#if projects.length > 0}
            <div class="space-y-3">
              {#each projects as project}
                <a
                  href="/projects/{project.id}"
                  class="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                      <div class="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full {getProjectStatusColor(project.status)}">
                          {project.status.replace('_', ' ')}
                        </span>
                        {#if project.expected_annual_savings}
                          <span>Est. Savings: ${project.expected_annual_savings.toLocaleString()}/year</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 dark:text-gray-400 text-center py-8">
              No projects yet. <a href="/projects/new?client={client.id}" class="text-primary-600 hover:text-primary-700">Create the first project</a>
            </p>
          {/if}
        </div>

        <!-- Notes -->
        {#if client.notes}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Notes
            </h2>
            <div class="prose dark:prose-invert max-w-none text-gray-900 dark:text-white">
              {client.notes}
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Column - Contract Info -->
      <div class="space-y-6">
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Contract Information
          </h2>
          <dl class="space-y-4">
            {#if client.contract_value}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Contract Value</dt>
                <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  ${client.contract_value.toLocaleString()}
                </dd>
              </div>
            {/if}
            {#if client.contract_start_date}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">
                  {new Date(client.contract_start_date).toLocaleDateString()}
                </dd>
              </div>
            {/if}
            {#if client.contract_end_date}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">
                  {new Date(client.contract_end_date).toLocaleDateString()}
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Statistics -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Statistics
          </h2>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Buildings</dt>
              <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{buildings.length}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</dt>
              <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Active Projects</dt>
              <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter(p => p.status === 'in_progress').length}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title="Delete Client">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{client?.name}</strong>?
    This action cannot be undone and will also delete all associated buildings, projects, and data.
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
