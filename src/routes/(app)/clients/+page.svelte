<script lang="ts">
  import { pb, type Client } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let clients = $state<Client[]>([]);
  let loading = $state(true);
  let deleteModalOpen = $state(false);
  let clientToDelete = $state<Client | null>(null);

  onMount(async () => {
    await loadClients();
  });

  async function loadClients() {
    try {
      loading = true;
      if (!pb) return;
      clients = await pb.collection('clients').getFullList({
        sort: '-created',
      });
    } catch (error: any) {
      toast.error('Failed to load clients: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function handleDelete(client: Client) {
    clientToDelete = client;
    deleteModalOpen = true;
  }

  async function confirmDelete() {
    if (!pb || !clientToDelete) return;

    try {
      await pb.collection('clients').delete(clientToDelete.id);
      toast.success('Client deleted successfully');
      deleteModalOpen = false;
      clientToDelete = null;
      await loadClients();
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
</script>

<svelte:head>
  <title>Clients - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Clients
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Manage your university clients and contracts
      </p>
    </div>
    <a href="/clients/new" class="btn btn-primary">
      + Add Client
    </a>
  </div>

  <!-- Clients Table -->
  <div class="card overflow-hidden">
    {#if loading}
      <div class="p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading clients...</p>
      </div>
    {:else if clients.length === 0}
      <div class="p-12 text-center">
        <p class="text-xl text-gray-600 dark:text-gray-400 mb-4">No clients yet</p>
        <a href="/clients/new" class="btn btn-primary">
          Add your first client
        </a>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contract Value
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {#each clients as client}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <a
                    href="/clients/{client.id}"
                    class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    {client.name}
                  </a>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm">
                    {#if client.contact_name}
                      <div class="font-medium text-gray-900 dark:text-white">{client.contact_name}</div>
                    {/if}
                    {#if client.contact_email}
                      <div class="text-gray-500 dark:text-gray-400">{client.contact_email}</div>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if client.city && client.state}
                    {client.city}, {client.state}
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(client.status)}">
                    {client.status}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if client.contract_value}
                    ${client.contract_value.toLocaleString()}
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-2">
                    <a
                      href="/clients/{client.id}"
                      class="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      title="View"
                    >
                      View
                    </a>
                    <a
                      href="/clients/{client.id}/edit"
                      class="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Edit"
                    >
                      Edit
                    </a>
                    <button
                      onclick={() => handleDelete(client)}
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
<Modal bind:open={deleteModalOpen} title="Delete Client">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{clientToDelete?.name}</strong>?
    This action cannot be undone and will also delete all associated buildings, projects, and data.
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
