<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/pocketbase';
  import PerspectiveViewer from '$lib/components/PerspectiveViewer.svelte';

  let energyData = $state<any[]>([]);
  let loading = $state(true);
  let error = $state('');
  let selectedView = $state<'consumption' | 'cost' | 'comparison' | 'trends' | 'demand' | 'fuel'>('consumption');
  let startDate = $state('');
  let endDate = $state('');
  let filteredData = $state<any[]>([]);

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
    await loadData();
    // Set default date range to last 90 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    endDate = end.toISOString().split('T')[0];
    startDate = start.toISOString().split('T')[0];
  });

  async function loadData() {
    try {
      loading = true;
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
  }

  // Filter data based on date range
  $effect(() => {
    if (!startDate && !endDate) {
      filteredData = energyData;
      return;
    }

    filteredData = energyData.filter(row => {
      const rowDate = new Date(row.timestamp);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return rowDate >= start && rowDate <= end;
    });
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
      group_by: ['timestamp'],
      columns: ['cost'],
      split_by: ['building'],
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
    trends: {
      plugin: 'Y Line',
      group_by: ['timestamp'],
      columns: ['usage_kwh'],
      split_by: ['building', 'fuel_type'],
      aggregates: {
        usage_kwh: 'sum',
      },
    },
    demand: {
      plugin: 'Y Area',
      group_by: ['timestamp'],
      columns: ['demand_kw'],
      split_by: ['building'],
      aggregates: {
        demand_kw: 'avg',
      },
    },
    fuel: {
      plugin: 'Sunburst',
      group_by: ['fuel_type', 'building'],
      columns: ['usage_kwh', 'cost'],
      aggregates: {
        usage_kwh: 'sum',
        cost: 'sum',
      },
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
    <div class="flex gap-2">
      <button onclick={loadData} class="btn btn-secondary" title="Refresh data">
        🔄 Refresh
      </button>
      <button onclick={exportData} class="btn btn-secondary">
        📥 Export CSV
      </button>
    </div>
  </div>

  <!-- Date Range Filter -->
  <div class="card p-4">
    <div class="flex items-center gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Start Date
        </label>
        <input
          type="date"
          bind:value={startDate}
          class="input w-full"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          End Date
        </label>
        <input
          type="date"
          bind:value={endDate}
          class="input w-full"
        />
      </div>
      <div class="flex items-end">
        <button
          onclick={() => { startDate = ''; endDate = ''; }}
          class="btn btn-secondary"
        >
          Clear Filters
        </button>
      </div>
      <div class="flex items-end">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Showing <span class="font-semibold text-gray-900 dark:text-white">{filteredData.length}</span> of {energyData.length} records
        </div>
      </div>
    </div>
  </div>

  <!-- View Selector -->
  <div class="card p-4">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <button
        onclick={() => selectedView = 'consumption'}
        class="btn {selectedView === 'consumption' ? 'btn-primary' : 'btn-secondary'}"
      >
        📊 Data Table
      </button>
      <button
        onclick={() => selectedView = 'comparison'}
        class="btn {selectedView === 'comparison' ? 'btn-primary' : 'btn-secondary'}"
      >
        📊 Comparison
      </button>
      <button
        onclick={() => selectedView = 'cost'}
        class="btn {selectedView === 'cost' ? 'btn-primary' : 'btn-secondary'}"
      >
        💰 Cost Analysis
      </button>
      <button
        onclick={() => selectedView = 'trends'}
        class="btn {selectedView === 'trends' ? 'btn-primary' : 'btn-secondary'}"
      >
        📈 Usage Trends
      </button>
      <button
        onclick={() => selectedView = 'demand'}
        class="btn {selectedView === 'demand' ? 'btn-primary' : 'btn-secondary'}"
      >
        ⚡ Demand Profile
      </button>
      <button
        onclick={() => selectedView = 'fuel'}
        class="btn {selectedView === 'fuel' ? 'btn-primary' : 'btn-secondary'}"
      >
        🔥 Fuel Breakdown
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
    {:else if filteredData.length === 0}
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-gray-600 dark:text-gray-400">
          <p class="text-xl mb-2">📊 No data available</p>
          <p>
            {#if energyData.length > 0}
              No data matches your filter criteria. Try adjusting the date range.
            {:else}
              Import energy data to get started.
            {/if}
          </p>
        </div>
      </div>
    {:else}
      <PerspectiveViewer data={filteredData} config={viewConfigs[selectedView]} class="h-full" />
    {/if}
  </div>

  <!-- Instructions -->
  <div class="card p-4 bg-primary-50 dark:bg-primary-900/20">
    <h3 class="font-medium text-primary-900 dark:text-primary-100 mb-2">
      💡 Analysis Tools & Features
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ul class="text-sm text-primary-700 dark:text-primary-300 space-y-1">
        <li>• <strong>Date Filters:</strong> Narrow down data by date range</li>
        <li>• <strong>6 View Types:</strong> Table, comparison, cost, trends, demand, and fuel breakdown</li>
        <li>• <strong>Interactive:</strong> Drag columns to pivot, click headers to sort</li>
      </ul>
      <ul class="text-sm text-primary-700 dark:text-primary-300 space-y-1">
        <li>• <strong>Export:</strong> Download filtered data as CSV</li>
        <li>• <strong>Refresh:</strong> Reload data from the database</li>
        <li>• <strong>Real-time:</strong> Data updates automatically as you import</li>
      </ul>
    </div>
  </div>
</div>
