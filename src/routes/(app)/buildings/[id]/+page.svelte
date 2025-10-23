<script lang="ts">
  import { pb, type Building, type EnergyData } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';
  import Modal from '$lib/components/ui/Modal.svelte';

  let building = $state<Building | null>(null);
  let energyData = $state<EnergyData[]>([]);
  let loading = $state(true);
  let deleteModalOpen = $state(false);

  const buildingId = $page.params.id as string;

  onMount(async () => {
    await loadBuilding();
  });

  async function loadBuilding() {
    try {
      loading = true;
      if (!pb) return;

      // Load building
      building = await pb.collection('buildings').getOne(buildingId, {
        expand: 'client',
      });

      // Load recent energy data
      const result = await pb.collection('energy_data').getList(1, 10, {
        filter: `building = "${buildingId}"`,
        sort: '-timestamp',
      });
      energyData = result.items as unknown as EnergyData[];
    } catch (error: any) {
      toast.error('Failed to load building: ' + error.message);
      goto('/buildings');
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!pb || !building) return;

    try {
      await pb.collection('buildings').delete(building.id);
      toast.success('Building deleted successfully');
      goto('/buildings');
    } catch (error: any) {
      toast.error('Failed to delete building: ' + error.message);
    }
  }

  function getBuildingTypeLabel(type?: string) {
    if (!type) return 'Not specified';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function getFuelTypeLabel(type: string) {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<svelte:head>
  <title>{building?.name || 'Building'} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  {:else if building}
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <a href="/buildings" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          ← Back to Buildings
        </a>
      </div>
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {building.name}
          </h1>
          <div class="flex items-center gap-3">
            <span class="text-gray-600 dark:text-gray-400">
              {getBuildingTypeLabel(building.building_type)}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/buildings/{building.id}/edit" class="btn btn-secondary">
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
        <!-- Client Information -->
        {#if building.expand?.client}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Client
            </h2>
            <a
              href="/clients/{building.expand.client.id}"
              class="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium text-lg"
            >
              {building.expand.client.name}
            </a>
          </div>
        {/if}

        <!-- Building Details -->
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Building Details
          </h2>
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if building.square_footage}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Square Footage</dt>
                <dd class="mt-1 text-gray-900 dark:text-white font-semibold">
                  {building.square_footage.toLocaleString()} sq ft
                </dd>
              </div>
            {/if}
            {#if building.year_built}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Year Built</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">{building.year_built}</dd>
              </div>
            {/if}
            {#if building.floors}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Floors</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">{building.floors}</dd>
              </div>
            {/if}
            {#if building.occupancy}
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Occupancy</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">{building.occupancy.toLocaleString()}</dd>
              </div>
            {/if}
            {#if building.address}
              <div class="md:col-span-2">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                <dd class="mt-1 text-gray-900 dark:text-white">{building.address}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Recent Energy Data -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Energy Data ({energyData.length})
            </h2>
            <a href="/energy-data?building={building.id}" class="btn btn-secondary btn-sm">
              View All
            </a>
          </div>
          {#if energyData.length > 0}
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Fuel Type</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Usage (kWh)</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Cost</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {#each energyData as data}
                    <tr>
                      <td class="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {new Date(data.timestamp).toLocaleDateString()}
                      </td>
                      <td class="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {getFuelTypeLabel(data.fuel_type)}
                      </td>
                      <td class="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {data.usage_kwh?.toLocaleString() || '-'}
                      </td>
                      <td class="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        ${data.cost?.toLocaleString() || '-'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-gray-500 dark:text-gray-400 text-center py-8">
              No energy data yet. <a href="/energy-data" class="text-primary-600 hover:text-primary-700">Import energy data</a>
            </p>
          {/if}
        </div>

        <!-- Notes -->
        {#if building.notes}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Notes
            </h2>
            <div class="prose dark:prose-invert max-w-none text-gray-900 dark:text-white">
              {building.notes}
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Column - Quick Stats -->
      <div class="space-y-6">
        <div class="card p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div class="space-y-3">
            <a href="/energy-data?building={building.id}" class="block btn btn-secondary w-full text-left">
              📊 View Energy Data
            </a>
            <a href="/energy-data" class="block btn btn-secondary w-full text-left">
              📥 Import Data
            </a>
            <a href="/analysis" class="block btn btn-secondary w-full text-left">
              📈 Analyze Performance
            </a>
          </div>
        </div>

        {#if building.square_footage && energyData.length > 0}
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Energy Metrics
            </h2>
            <dl class="space-y-4">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Records</dt>
                <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{energyData.length}</dd>
              </div>
              {#if energyData[0]?.usage_kwh && building.square_footage}
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Latest Usage Intensity</dt>
                  <dd class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                    {(energyData[0].usage_kwh / building.square_footage).toFixed(2)} kWh/sq ft
                  </dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title="Delete Building">
  <p class="text-gray-700 dark:text-gray-300">
    Are you sure you want to delete <strong>{building?.name}</strong>?
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
