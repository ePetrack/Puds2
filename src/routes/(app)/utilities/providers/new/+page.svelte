<script lang="ts">
	import { enhance } from '$app/forms';
	import ProviderForm from '$lib/components/utilities/ProviderForm.svelte';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Add Provider - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/providers"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Providers
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Provider</h1>
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
			values={form?.values ?? {}}
			selectedTypes={form?.utilityTypes ?? []}
			errors={form?.errors ?? {}}
			submitLabel="Create Provider"
			cancelHref="/utilities/providers"
			{submitting}
		/>
	</form>
</div>
