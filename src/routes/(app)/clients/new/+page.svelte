<script lang="ts">
  import { pb } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';
  import { clientSchema, type ClientFormData } from '$lib/schemas';
  import FormField from '$lib/components/forms/FormField.svelte';
  import Input from '$lib/components/forms/Input.svelte';
  import Select from '$lib/components/forms/Select.svelte';
  import TextArea from '$lib/components/forms/TextArea.svelte';

  let formData = $state<ClientFormData>({
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_value: '' as any,
    status: 'prospective',
    notes: '',
  });

  let errors = $state<Record<string, string>>({});
  let submitting = $state(false);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'prospective', label: 'Prospective' },
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errors = {};
    submitting = true;

    try {
      // Validate with Zod
      const validated = clientSchema.parse(formData);

      if (!pb) throw new Error('PocketBase not initialized');

      // Create client
      await pb.collection('clients').create(validated);

      toast.success('Client created successfully');
      goto('/clients');
    } catch (error: any) {
      if (error.issues) {
        // Zod validation errors
        error.issues.forEach((issue: any) => {
          errors[issue.path[0]] = issue.message;
        });
        toast.error('Please fix the validation errors');
      } else {
        toast.error('Failed to create client: ' + error.message);
      }
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Add Client - Energy Management Platform</title>
</svelte:head>

<div class="max-w-4xl space-y-6">
  <!-- Header -->
  <div>
    <div class="flex items-center gap-2 mb-2">
      <a href="/clients" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
        ← Back
      </a>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Add New Client
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Create a new university client
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
            <FormField label="Client Name" error={errors.name} required>
              <Input bind:value={formData.name} placeholder="State University" required />
            </FormField>
          </div>

          <FormField label="Status" error={errors.status} required>
            <Select bind:value={formData.status} options={statusOptions} required />
          </FormField>
        </div>
      </div>

      <!-- Contact Information -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Contact Information
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Contact Name" error={errors.contact_name}>
            <Input bind:value={formData.contact_name} placeholder="Dr. John Smith" />
          </FormField>

          <FormField label="Contact Email" error={errors.contact_email}>
            <Input type="email" bind:value={formData.contact_email} placeholder="john.smith@university.edu" />
          </FormField>

          <FormField label="Contact Phone" error={errors.contact_phone}>
            <Input type="tel" bind:value={formData.contact_phone} placeholder="555-0123" />
          </FormField>
        </div>
      </div>

      <!-- Address -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Address
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <FormField label="Street Address" error={errors.address}>
              <Input bind:value={formData.address} placeholder="123 University Ave" />
            </FormField>
          </div>

          <FormField label="City" error={errors.city}>
            <Input bind:value={formData.city} placeholder="College Town" />
          </FormField>

          <div class="grid grid-cols-2 gap-4">
            <FormField label="State" error={errors.state}>
              <Input bind:value={formData.state} placeholder="CA" />
            </FormField>

            <FormField label="ZIP Code" error={errors.zip}>
              <Input bind:value={formData.zip} placeholder="90210" />
            </FormField>
          </div>
        </div>
      </div>

      <!-- Contract Information -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Contract Information
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Contract Start Date" error={errors.contract_start_date}>
            <Input type="date" bind:value={formData.contract_start_date} />
          </FormField>

          <FormField label="Contract End Date" error={errors.contract_end_date}>
            <Input type="date" bind:value={formData.contract_end_date} />
          </FormField>

          <FormField label="Contract Value" error={errors.contract_value}>
            <Input type="number" bind:value={formData.contract_value} placeholder="250000" step="0.01" min="0" />
          </FormField>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <FormField label="Notes" error={errors.notes}>
          <TextArea bind:value={formData.notes} placeholder="Additional information about the client..." rows={4} />
        </FormField>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <a href="/clients" class="btn btn-secondary">
          Cancel
        </a>
        <button type="submit" class="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Client'}
        </button>
      </div>
    </div>
  </form>
</div>
