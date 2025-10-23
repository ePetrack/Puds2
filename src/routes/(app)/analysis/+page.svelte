<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/pocketbase';
  import PerspectiveViewer from '$lib/components/PerspectiveViewer.svelte';

  let energyData = $state<any[]>([]);
  let loading = $state(true);
  let error = $state('');
  let selectedView = $state<'consumption' | 'cost' | 'comparison'>('consumption');

  // Sample data for demonstration
  const sampleData = [
    {
      building: 'Science Hall',
      fuel_type: 'electricity',
      timestamp: '2024-01-15',
      usage_kwh: 12500,
      cost: 1875,
      demand_kw: 85,
    },
    {
      building: 'Science Hall',
      fuel_type: 'natural_gas',
      timestamp: '2024-01-15',
      usage_kwh: 8500,
      cost: 680,
      demand_kw: 0,
    },
    {
      building: 'Student Center',
      fuel_type: 'electricity',
      timestamp: '2024-01-15',
      usage_kwh: 15200,
      cost: 2280,
      demand_kw: 95,
    },
    {
      building: 'Library',
      fuel_type: 'electricity',
      timestamp: '2024-01-15',
      usage_kwh: 9800,
      cost: 1470,
      demand_kw: 68,
    },
    {
      building: 'Science Hall',
      fuel_type: 'electricity',
      timestamp: '2024-02-15',
      usage_kwh: 11800,
      cost: 1770,
      demand_kw: 82,
    },
    {
      building: 'Science Hall',
      fuel_type: 'natural_gas',
      timestamp: '2024-02-15',
      usage_kwh: 7200,
      cost: 576,
      demand_kw: 0,
    },
    {
      building: 'Student Center',
      fuel_type: 'electricity',
      timestamp: '2024-02-15',
      usage_kwh: 14500,
      cost: 2175,
      demand_kw: 92,
    },
    {
      building: 'Library',
      fuel_type: 'electricity',
      timestamp: '2024-02-15',
      usage_kwh: 9200,
      cost: 1380,
      demand_kw: 64,
    },
    {
      building: 'Science Hall',
      fuel_type: 'electricity',
      timestamp: '2024-03-15',
      usage_kwh: 10500,
      cost: 1575,
      demand_kw: 78,
    },
    {
      building: 'Science Hall',
      fuel_type: 'natural_gas',
      timestamp: '2024-03-15',
      usage_kwh: 6800,
      cost: 544,
      demand_kw: 0,
    },
    {
      building: 'Student Center',
      fuel_type: 'electricity',
      timestamp: '2024-03-15',
      usage_kwh: 13800,
      cost: 2070,
      demand_kw: 88,
    },
    {
      building: 'Library',
      fuel_type: 'electricity',
      timestamp: '2024-03-15',
      usage_kwh: 8900,
      cost: 1335,
      demand_kw: 62,
    },
    {
      building: 'Dormitory A',
      fuel_type: 'electricity',
      timestamp: '2024-01-15',
      usage_kwh: 18500,
      cost: 2775,
      demand_kw: 105,
    },
    {
      building: 'Dormitory A',
      fuel_type: 'electricity',
      timestamp: '2024-02-15',
      usage_kwh: 17200,
      cost: 2580,
      demand_kw: 98,
    },
    {
      building: 'Dormitory A',
      fuel_type: 'electricity',
      timestamp: '2024-03-15',
      usage_kwh: 16800,
      cost: 2520,
      demand_kw: 95,
    },
  ];

  onMount(async () => {
    try {
      if (!pb) {
        energyData = sampleData;
        loading = false;
        return;
      }

      // Try to fetch real data from PocketBase
      const records = await pb.collection('energy_data').getFullList({
        sort: '-timestamp',
        expand: 'building',
      });

      if (records.length > 0) {
        energyData = records.map((r: any) => ({
          building: r.expand?.building?.name || 'Unknown',
          fuel_type: r.fuel_type,
          timestamp: r.timestamp,
          usage_kwh: r.usage_kwh || 0,
          cost: r.cost || 0,
          demand_kw: r.demand_kw || 0,
        }));
      } else {
        // Use sample data if no real data exists
        energyData = sampleData;
      }
    } catch (err: any) {
      console.warn('Using sample data:', err.message);
      energyData = sampleData;
    } finally {
      loading = false;
    }
  });

  // Perspective configurations for different views
  const viewConfigs = {
    consumption: {
      plugin: 'Datagrid',
      group_by: ['building', 'fuel_type'],
      columns: ['timestamp', 'usage_kwh', 'cost', 'demand_kw'],
      aggregates: {
        usage_kwh: 'sum',
        cost: 'sum',
        demand_kw: 'avg',
      },
      sort: [['usage_kwh', 'desc']],
    },
    cost: {
      plugin: 'Y Line',
      group_by: ['building'],
      columns: ['cost'],
      split_by: ['fuel_type'],
      aggregates: {
        cost: 'sum',
      },
    },
    comparison: {
      plugin: 'Y Bar',
      group_by: ['building'],
      columns: ['usage_kwh', 'cost'],
      aggregates: {
        usage_kwh: 'sum',
        cost: 'sum',
      },
      sort: [['usage_kwh', 'desc']],
    },
  };

  function exportData() {
    const csv = convertToCSV(energyData);
    downloadFile(csv, 'energy-data-export.csv', 'text/csv');
  }

  function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header]).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Energy Data Analysis - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6 h-full flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Energy Data Analysis
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Interactive data analysis powered by Perspective.js
      </p>
    </div>
    <button onclick={exportData} class="btn btn-secondary">
      📥 Export CSV
    </button>
  </div>

  <!-- View Selector -->
  <div class="card p-4">
    <div class="flex gap-2">
      <button
        onclick={() => selectedView = 'consumption'}
        class="btn"
        class:btn-primary={selectedView === 'consumption'}
        class:btn-secondary={selectedView !== 'consumption'}
      >
        📊 Consumption Table
      </button>
      <button
        onclick={() => selectedView = 'cost'}
        class="btn"
        class:btn-primary={selectedView === 'cost'}
        class:btn-secondary={selectedView !== 'cost'}
      >
        📈 Cost Trends
      </button>
      <button
        onclick={() => selectedView = 'comparison'}
        class="btn"
        class:btn-primary={selectedView === 'comparison'}
        class:btn-secondary={selectedView !== 'comparison'}
      >
        📊 Building Comparison
      </button>
    </div>
  </div>

  <!-- Perspective Viewer -->
  <div class="card p-6 flex-1 min-h-0">
    {#if loading}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">Loading energy data...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-red-600 dark:text-red-400">
          <p class="text-xl mb-2">⚠️ Error loading data</p>
          <p>{error}</p>
        </div>
      </div>
    {:else if energyData.length === 0}
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-gray-600 dark:text-gray-400">
          <p class="text-xl mb-2">📊 No data available</p>
          <p>Import energy data to get started</p>
        </div>
      </div>
    {:else}
      <PerspectiveViewer data={energyData} config={viewConfigs[selectedView]} class="h-full" />
    {/if}
  </div>

  <!-- Instructions -->
  <div class="card p-4 bg-primary-50 dark:bg-primary-900/20">
    <h3 class="font-medium text-primary-900 dark:text-primary-100 mb-2">
      💡 How to use Perspective.js
    </h3>
    <ul class="text-sm text-primary-700 dark:text-primary-300 space-y-1">
      <li>• Drag columns to "Group By" to pivot data</li>
      <li>• Click column headers to sort</li>
      <li>• Right-click on the table for more options</li>
      <li>• Switch between different visualization types using the buttons above</li>
      <li>• Use the export button to download data as CSV</li>
    </ul>
  </div>
</div>
