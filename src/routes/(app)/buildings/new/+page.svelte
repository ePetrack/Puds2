<script lang="ts">
  import { pb, type Client } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/stores/toast';
  import FormField from '$lib/components/forms/FormField.svelte';
  import Input from '$lib/components/forms/Input.svelte';
  import Select from '$lib/components/forms/Select.svelte';
  import TextArea from '$lib/components/forms/TextArea.svelte';
  import { z } from 'zod';

  let clients = $state<Client[]>([]);
  let loadingClients = $state(true);
  let submitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Get client ID from query params if present
  const clientIdFromQuery = $page.url.searchParams.get('client');

  let formData = $state({
    client: clientIdFromQuery || '',
    name: '',
    square_footage: '',
    building_type: '',
    year_built: '',
    address: '',
    floors: '',
    occupancy: '',
    notes: '',
  });

  const buildingSchema = z.object({
    client: z.string().min(1, 'Client is required'),
    name: z.string().min(1, 'Building name is required').max(200),
    square_footage: z.string().optional(),
    building_type: z.enum(['academic', 'administrative', 'residential', 'laboratory', 'athletic', 'library', 'healthcare', 'dining', 'other']).optional().or(z.literal('')),
    year_built: z.string().optional(),
    address: z.string().max(500).optional(),
    floors: z.string().optional(),
    occupancy: z.string().optional(),
    notes: z.string().optional(),
  });

  $effect(() => {
    loadClients();
  });

  async function loadClients() {
    try {
      if (!pb) return;
      clients = await pb.collection('clients').getFullList({
        sort: 'name',
        filter: 'status = "active" || status = "prospective"',
      });
    } catch (error: any) {
      toast.error('Failed to load clients: ' + error.message);
    } finally {
      loadingClients = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errors = {};

    try {
      // Validate
      const validated = buildingSchema.parse(formData);

      submitting = true;

      // Convert form data to PocketBase format
      const data: Record<string, any> = {
        client: validated.client,
        name: validated.name,
        address: validated.address || '',
        notes: validated.notes || '',
      };

      // Add optional fields if they have values
      if (validated.square_footage) {
        data.square_footage = parseInt(validated.square_footage);
      }
      if (validated.building_type) {
        data.building_type = validated.building_type;
      }
      if (validated.year_built) {
        data.year_built = parseInt(validated.year_built);
      }
      if (validated.floors) {
        data.floors = parseInt(validated.floors);
      }
      if (validated.occupancy) {
        data.occupancy = parseInt(validated.occupancy);
      }

      const record = await pb!.collection('buildings').create(data);
      toast.success('Building created successfully');
      goto(`/buildings/${record.id}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        toast.error('Please fix the errors in the form');
      } else {
        toast.error('Failed to create building: ' + error.message);
      }
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Add Building - Energy Management Platform</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
  <!-- Header -->
  <div>
    <div class="flex items-center gap-2 mb-2">
      <a href="/buildings" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
        ← Back to Buildings
      </a>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Add Building
    </h1>
  </div>

  <!-- Form -->
  <form onsubmit={handleSubmit} class="card p-6 space-y-6">
    <!-- Basic Information -->
    <div>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Basic Information
      </h2>
      <div class="space-y-4">
        <FormField label="Client" required error={errors.client}>
          {#if loadingClients}
            <div class="input flex items-center justify-center text-gray-500">
              Loading clients...
            </div>
          {:else}
            <Select
              bind:value={formData.client}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select a client"
              required
            />
          {/if}
        </FormField>

        <FormField label="Building Name" required error={errors.name}>
          <Input
            bind:value={formData.name}
            placeholder="e.g., Science Hall"
            required
          />
        </FormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Building Type" error={errors.building_type}>
            <Select
              bind:value={formData.building_type}
              options={[
                { value: 'academic', label: 'Academic' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'residential', label: 'Residential' },
                { value: 'laboratory', label: 'Laboratory' },
                { value: 'athletic', label: 'Athletic' },
                { value: 'library', label: 'Library' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'dining', label: 'Dining' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder="Select type"
            />
          </FormField>

          <FormField label="Year Built" error={errors.year_built}>
            <Input
              type="number"
              bind:value={formData.year_built}
              placeholder="e.g., 1995"
              min={1800}
              max={new Date().getFullYear()}
            />
          </FormField>
        </div>
      </div>
    </div>

    <!-- Building Details -->
    <div>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Building Details
      </h2>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Square Footage" error={errors.square_footage}>
            <Input
              type="number"
              bind:value={formData.square_footage}
              placeholder="e.g., 50000"
              min={0}
            />
          </FormField>

          <FormField label="Number of Floors" error={errors.floors}>
            <Input
              type="number"
              bind:value={formData.floors}
              placeholder="e.g., 5"
              min={1}
            />
          </FormField>

          <FormField label="Occupancy" error={errors.occupancy}>
            <Input
              type="number"
              bind:value={formData.occupancy}
              placeholder="e.g., 500"
              min={0}
            />
          </FormField>
        </div>

        <FormField label="Address" error={errors.address}>
          <Input
            bind:value={formData.address}
            placeholder="e.g., 123 Main St, City, State 12345"
          />
        </FormField>
      </div>
    </div>

    <!-- Notes -->
    <FormField label="Notes" error={errors.notes}>
      <TextArea
        bind:value={formData.notes}
        placeholder="Additional information about this building..."
        rows={4}
      />
    </FormField>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <a href="/buildings" class="btn btn-secondary">
        Cancel
      </a>
      <button type="submit" disabled={submitting} class="btn btn-primary">
        {submitting ? 'Creating...' : 'Create Building'}
      </button>
    </div>
  </form>
</div>
