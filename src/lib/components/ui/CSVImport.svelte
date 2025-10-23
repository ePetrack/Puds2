<script lang="ts">
  import { pb, type Building } from '$lib/pocketbase';
  import { toast } from '$lib/stores/toast';
  import { parseCSV, validateEnergyDataRow, convertToEnergyData } from '$lib/utils/csv';
  import Select from '$lib/components/forms/Select.svelte';
  import FormField from '$lib/components/forms/FormField.svelte';

  let fileInput: HTMLInputElement;
  let selectedFile = $state<File | null>(null);
  let previewData = $state<any[]>([]);
  let validationResults = $state<any[]>([]);
  let selectedBuilding = $state('');
  let buildings = $state<Building[]>([]);
  let loadingBuildings = $state(true);
  let importing = $state(false);
  let showPreview = $state(false);

  $effect(() => {
    loadBuildings();
  });

  async function loadBuildings() {
    try {
      if (!pb) return;
      buildings = await pb.collection('buildings').getFullList({
        sort: 'name',
        expand: 'client',
      });
    } catch (error: any) {
      toast.error('Failed to load buildings: ' + error.message);
    } finally {
      loadingBuildings = false;
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    selectedFile = target.files[0];
    processFile();
  }

  async function processFile() {
    if (!selectedFile) return;

    const text = await selectedFile.text();
    const data = parseCSV(text);

    previewData = data.slice(0, 10); // Show first 10 rows
    validationResults = data.map(row => validateEnergyDataRow(row));
    showPreview = true;
  }

  async function handleImport() {
    if (!selectedFile || !selectedBuilding) {
      toast.error('Please select a building and upload a CSV file');
      return;
    }

    importing = true;

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const validation = validateEnergyDataRow(row);

        if (!validation.valid) {
          errorCount++;
          continue;
        }

        try {
          const energyData = convertToEnergyData(row, selectedBuilding);
          await pb!.collection('energy_data').create(energyData);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} records`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} records failed to import`);
      }

      // Reset
      selectedFile = null;
      previewData = [];
      validationResults = [];
      showPreview = false;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    } finally {
      importing = false;
    }
  }

  function getValidCount(): number {
    return validationResults.filter(r => r.valid).length;
  }

  function getInvalidCount(): number {
    return validationResults.filter(r => !r.valid).length;
  }
</script>

<div class="space-y-6">
  <!-- Building Selection -->
  <FormField label="Target Building" required>
    {#if loadingBuildings}
      <div class="input flex items-center justify-center text-gray-500">
        Loading buildings...
      </div>
    {:else}
      <Select
        bind:value={selectedBuilding}
        options={buildings.map(b => ({
          value: b.id,
          label: b.expand?.client ? `${b.name} (${b.expand.client.name})` : b.name
        }))}
        placeholder="Select a building for this data"
        required
      />
    {/if}
  </FormField>

  <!-- File Upload -->
  <div>
    <label class="label">Upload CSV File</label>
    <div class="mt-2">
      <input
        bind:this={fileInput}
        type="file"
        accept=".csv"
        onchange={handleFileSelect}
        class="block w-full text-sm text-gray-900 dark:text-gray-100
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-primary-50 file:text-primary-700
          hover:file:bg-primary-100
          dark:file:bg-primary-900/20 dark:file:text-primary-400
          dark:hover:file:bg-primary-900/30"
      />
    </div>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      Expected columns: building_name, timestamp, fuel_type, usage_kwh, cost, demand_kw, meter_id
    </p>
  </div>

  <!-- Preview -->
  {#if showPreview && previewData.length > 0}
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Preview (First 10 rows)
      </h3>

      <!-- Validation Summary -->
      <div class="mb-4 flex items-center gap-4">
        <div class="text-sm">
          <span class="text-green-600 dark:text-green-400 font-semibold">
            {getValidCount()} valid
          </span>
          {#if getInvalidCount() > 0}
            <span class="mx-2">•</span>
            <span class="text-red-600 dark:text-red-400 font-semibold">
              {getInvalidCount()} invalid
            </span>
          {/if}
        </div>
      </div>

      <!-- Preview Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Fuel Type</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Usage (kWh)</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Cost</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {#each previewData as row, index}
              <tr class={!validationResults[index]?.valid ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                <td class="px-3 py-2">
                  {#if validationResults[index]?.valid}
                    <span class="text-green-600 dark:text-green-400">✓</span>
                  {:else}
                    <span class="text-red-600 dark:text-red-400" title={validationResults[index]?.errors.join(', ')}>✗</span>
                  {/if}
                </td>
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{row.timestamp}</td>
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{row.fuel_type}</td>
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{row.usage_kwh}</td>
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">{row.cost}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Import Button -->
      <div class="mt-6 flex justify-end">
        <button
          onclick={handleImport}
          disabled={importing || !selectedBuilding || getValidCount() === 0}
          class="btn btn-primary"
        >
          {importing ? 'Importing...' : `Import ${getValidCount()} Records`}
        </button>
      </div>
    </div>
  {/if}

  <!-- Template Download -->
  <div class="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
    <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">
      Need a template?
    </h4>
    <p class="text-sm text-blue-700 dark:text-blue-300 mb-3">
      Download our CSV template with example data to get started quickly.
    </p>
    <a
      href="/templates/energy-data-template.csv"
      download
      class="btn btn-secondary text-sm"
    >
      Download Template
    </a>
  </div>
</div>
