<script lang="ts">
	import { enhance } from '$app/forms';
	import CampusForm from '$lib/components/campuses/CampusForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	let values = $derived(form?.values ?? { clientId: data.preselectedClient });
</script>

<svelte:head>
	<title>Add Campus - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/campuses"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Campuses
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Campus</h1>
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
		<CampusForm
			{values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			submitLabel="Create Campus"
			cancelHref="/campuses"
			{submitting}
		/>
	</form>
</div>
