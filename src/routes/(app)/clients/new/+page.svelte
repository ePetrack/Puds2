<script lang="ts">
	import { enhance } from '$app/forms';
	import ClientForm from '$lib/components/clients/ClientForm.svelte';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Add Client - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/clients"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Clients
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Client</h1>
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
			values={form?.values ?? {}}
			errors={form?.errors ?? {}}
			submitLabel="Create Client"
			cancelHref="/clients"
			{submitting}
		/>
	</form>
</div>
