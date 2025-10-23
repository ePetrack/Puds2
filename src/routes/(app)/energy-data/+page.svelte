<script lang="ts">
  import { pb } from '$lib/pocketbase';
  import { onMount } from 'svelte';
  import { toast } from '$lib/stores/toast';
  import CSVImport from '$lib/components/ui/CSVImport.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  let energyData = $state<any[]>([]);
  let loading = $state(true);
  let showImportModal = $state(false);
  let stats = $state({
    total: 0,
    lastMonth: 0,
    buildings: 0,
  });

  onMount(async () => {
    await loadEnergyData();
  });

  async function loadEnergyData() {
    try {
      loading = true;
      if (!pb) return;

      // Load recent energy data
      energyData = await pb.collection('energy_data').getFullList({
        sort: '-timestamp',
        limit: 50,
        expand: 'building,building.client',
      });

      // Calculate stats
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      stats = {
        total: energyData.length,
        lastMonth: energyData.filter(d => new Date(d.timestamp) > lastMonth).length,
        buildings: new Set(energyData.map(d => d.building)).size,
      };
    } catch (error: any) {
      toast.error('Failed to load energy data: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function getFuelTypeColor(fuelType: string) {
    switch (fuelType) {
      case 'electricity':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'natural_gas':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'steam':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'chilled_water':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  async function handleImportComplete() {
    showImportModal = false;
    await loadEnergyData();
  }
</script>

<svelte:head>
  <title>Energy Data - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Energy Data
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Manage and analyze energy consumption data
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button onclick={() => showImportModal = true} class="btn btn-primary">
        📥 Import CSV
      </button>
      <a href="/analysis" class="btn btn-secondary">
        📊 Analyze Data
      </a>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="card p-6">
      <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Total Records
      </div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {stats.total}
      </div>
    </div>

    <div class="card p-6">
      <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Last Month
      </div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {stats.lastMonth}
      </div>
    </div>

    <div class="card p-6">
      <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Buildings Tracked
      </div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {stats.buildings}
      </div>
    </div>
  </div>

  <!-- Recent Data -->
  <div class="card overflow-hidden">
    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        Recent Energy Data (Last 50 records)
      </h2>
    </div>

    {#if loading}
      <div class="p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading data...</p>
      </div>
    {:else if energyData.length === 0}
      <div class="p-12 text-center">
        <p class="text-xl text-gray-600 dark:text-gray-400 mb-4">No energy data yet</p>
        <button onclick={() => showImportModal = true} class="btn btn-primary">
          Import Your First Data
        </button>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Building
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Fuel Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Usage (kWh)
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Cost
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Demand (kW)
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {#each energyData as record}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Date(record.timestamp).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {#if record.expand?.building}
                    <a href="/buildings/{record.building}" class="hover:text-primary-600 dark:hover:text-primary-400">
                      {record.expand.building.name}
                    </a>
                    {#if record.expand.building.expand?.client}
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {record.expand.building.expand.client.name}
                      </div>
                    {/if}
                  {:else}
                    -
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full {getFuelTypeColor(record.fuel_type)}">
                    {record.fuel_type.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if record.usage_kwh}
                    {record.usage_kwh.toLocaleString()}
                  {:else}
                    -
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if record.cost}
                    ${record.cost.toLocaleString()}
                  {:else}
                    -
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {#if record.demand_kw}
                    {record.demand_kw.toLocaleString()}
                  {:else}
                    -
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Import Modal -->
<Modal bind:open={showImportModal} title="Import Energy Data">
  <CSVImport />
</Modal>
