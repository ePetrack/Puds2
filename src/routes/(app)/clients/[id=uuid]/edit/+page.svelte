<script lang="ts">
	import { enhance } from '$app/forms';
	import ClientForm from '$lib/components/clients/ClientForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.clientName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/clients/{data.clientId}"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to {data.clientName}
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Client</h1>
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
		<ClientForm
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			submitLabel="Save Changes"
			cancelHref="/clients/{data.clientId}"
			{submitting}
		/>
	</form>
</div>
