<script lang="ts">
  import { pb, type Client } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/stores/toast';
  import { projectSchema, type ProjectFormData } from '$lib/schemas';
  import FormField from '$lib/components/forms/FormField.svelte';
  import Input from '$lib/components/forms/Input.svelte';
  import Select from '$lib/components/forms/Select.svelte';
  import TextArea from '$lib/components/forms/TextArea.svelte';
  import { onMount } from 'svelte';

  const projectId = $page.params.id as string;

  let formData = $state<ProjectFormData>({
    client: '',
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: '',
    budget: '' as any,
    actual_cost: '' as any,
    expected_annual_savings: '' as any,
    actual_annual_savings: '' as any,
    roi_years: '' as any,
  });

  let errors = $state<Record<string, string>>({});
  let submitting = $state(false);
  let loading = $state(true);
  let loadingClients = $state(true);
  let clients = $state<Client[]>([]);

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  onMount(async () => {
    await Promise.all([loadProject(), loadClients()]);
  });

  async function loadProject() {
    try {
      loading = true;
      if (!pb) return;

      const project = await pb.collection('projects').getOne(projectId);

      // Populate form with existing data
      formData = {
        client: project.client || '',
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || '',
        actual_cost: project.actual_cost || '',
        expected_annual_savings: project.expected_annual_savings || '',
        actual_annual_savings: project.actual_annual_savings || '',
        roi_years: project.roi_years || '',
      };
    } catch (error: any) {
      toast.error('Failed to load project: ' + error.message);
      goto('/projects');
    } finally {
      loading = false;
    }
  }

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
    submitting = true;

    try {
      // Validate with Zod
      const validated = projectSchema.parse(formData);

      if (!pb) throw new Error('PocketBase not initialized');

      // Update project
      await pb.collection('projects').update(projectId, validated);

      toast.success('Project updated successfully');
      goto(`/projects/${projectId}`);
    } catch (error: any) {
      if (error.issues) {
        // Zod validation errors
        error.issues.forEach((issue: any) => {
          errors[issue.path[0]] = issue.message;
        });
        toast.error('Please fix the validation errors');
      } else {
        toast.error('Failed to update project: ' + error.message);
      }
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Edit {formData.name || 'Project'} - Energy Management Platform</title>
</svelte:head>

<div class="max-w-4xl space-y-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  {:else}
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <a href="/projects/{projectId}" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          ← Back
        </a>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Edit Project
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Update project information
      </p>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="card p-6">
      <div class="space-y-6">
        <!-- Basic Information -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <FormField label="Client" error={errors.client} required>
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
            </div>

            <div class="md:col-span-2">
              <FormField label="Project Name" error={errors.name} required>
                <Input bind:value={formData.name} placeholder="HVAC Upgrade - Science Hall" required />
              </FormField>
            </div>

            <FormField label="Status" error={errors.status} required>
              <Select bind:value={formData.status} options={statusOptions} required />
            </FormField>
          </div>
        </div>

        <!-- Description -->
        <div>
          <FormField label="Description" error={errors.description}>
            <TextArea bind:value={formData.description} placeholder="Project goals, scope, and key details..." rows={4} />
          </FormField>
        </div>

        <!-- Timeline -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Timeline
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Start Date" error={errors.start_date}>
              <Input type="date" bind:value={formData.start_date} />
            </FormField>

            <FormField label="End Date" error={errors.end_date}>
              <Input type="date" bind:value={formData.end_date} />
            </FormField>
          </div>
        </div>

        <!-- Financial Information -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Financial Information
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Budget" error={errors.budget}>
              <Input
                type="number"
                bind:value={formData.budget}
                placeholder="450000"
                step="0.01"
                min="0"
              />
            </FormField>

            <FormField label="Actual Cost" error={errors.actual_cost}>
              <Input
                type="number"
                bind:value={formData.actual_cost}
                placeholder="0"
                step="0.01"
                min="0"
              />
            </FormField>

            <FormField label="Expected Annual Savings" error={errors.expected_annual_savings}>
              <Input
                type="number"
                bind:value={formData.expected_annual_savings}
                placeholder="65000"
                step="0.01"
                min="0"
              />
            </FormField>

            <FormField label="Actual Annual Savings" error={errors.actual_annual_savings}>
              <Input
                type="number"
                bind:value={formData.actual_annual_savings}
                placeholder="0"
                step="0.01"
                min="0"
              />
            </FormField>

            <FormField label="ROI (Years)" error={errors.roi_years} hint="Payback period in years">
              <Input
                type="number"
                bind:value={formData.roi_years}
                placeholder="6.9"
                step="0.1"
                min="0"
              />
            </FormField>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a href="/projects/{projectId}" class="btn btn-secondary">
            Cancel
          </a>
          <button type="submit" class="btn btn-primary" disabled={submitting || loadingClients}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  {/if}
</div>
