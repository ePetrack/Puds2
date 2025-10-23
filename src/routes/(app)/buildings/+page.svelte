<script lang="ts">
  import { pb, type Building } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let buildings = $state<Building[]>([]);
  let loading = $state(true);
  let deleteModalOpen = $state(false);
  let buildingToDelete = $state<Building | null>(null);

  onMount(async () => {
    await loadBuildings();
  });

  async function loadBuildings() {
    try {
      loading = true;
      if (!pb) return;
      buildings = await pb.collection('buildings').getFullList({
        sort: '-created',
        expand: 'client',
      });
    } catch (error: any) {
      toast.error('Failed to load buildings: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function confirmDelete(building: Building) {
    buildingToDelete = building;
    deleteModalOpen = true;
  }

  async function handleDelete() {
    if (!pb || !buildingToDelete) return;

    try {
      await pb.collection('buildings').delete(buildingToDelete.id);
      toast.success('Building deleted successfully');
      deleteModalOpen = false;
      buildingToDelete = null;
      await loadBuildings();
    } catch (error: any) {
      toast.error('Failed to delete building: ' + error.message);
    }
  }

  function getBuildingTypeLabel(type?: string) {
    if (!type) return '';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<svelte:head>
  <title>Buildings - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Buildings
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Manage building inventory and details
      </p>
    </div>
    <a href="/buildings/new" class="btn btn-primary">
      + Add Building
    </a>
  </div>

  <!-- Buildings Table -->
  <div class="card overflow-hidden">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    {:else if buildings.length === 0}
      <div class="text-center py-12">
        <div class="text-6xl mb-4">🏢</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No buildings yet
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Get started by adding your first building
        </p>
        <a href="/buildings/new" class="btn btn-primary">
          + Add Building
        </a>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Building Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Square Footage
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Year Built
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {#each buildings as building}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-6 py-4 whitespace-nowrap">
                  <a href="/buildings/{building.id}" class="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                    {building.name}
                  </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if building.expand?.client}
                    <a href="/clients/{building.expand.client.id}" class="text-primary-600 hover:text-primary-900 dark:text-primary-400">
                      {building.expand.client.name}
                    </a>
                  {:else}
                    -
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {getBuildingTypeLabel(building.building_type)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {building.square_footage ? building.square_footage.toLocaleString() + ' sq ft' : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {building.year_built || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <a href="/buildings/{building.id}" class="text-primary-600 hover:text-primary-900 dark:text-primary-400">
                      View
                    </a>
                    <a href="/buildings/{building.id}/edit" class="text-blue-600 hover:text-blue-900 dark:text-blue-400">
                      Edit
                    </a>
                    <button
                      onclick={() => confirmDelete(building)}
                      class="text-red-600 hover:text-red-900 dark:text-red-400"
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
<Modal bind:open={deleteModalOpen} title="Delete Building">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{buildingToDelete?.name}</strong>?
    This action cannot be undone and will also delete all associated energy data.
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
