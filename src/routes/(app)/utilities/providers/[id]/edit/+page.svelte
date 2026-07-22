<script lang="ts">
	import { enhance } from '$app/forms';
	import ProviderForm from '$lib/components/utilities/ProviderForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.providerName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/providers"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Providers
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Provider</h1>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<ProviderForm
			values={form?.values ?? data.values}
			selectedTypes={form?.utilityTypes ?? data.selectedTypes}
			errors={form?.errors ?? {}}
			submitLabel="Save Changes"
			cancelHref="/utilities/providers"
			{submitting}
		/>
	</form>
</div>
