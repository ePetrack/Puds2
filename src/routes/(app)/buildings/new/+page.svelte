<script lang="ts">
	import { enhance } from '$app/forms';
	import BuildingForm from '$lib/components/buildings/BuildingForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	let values = $derived(form?.values ?? { clientId: data.preselectedClient });
</script>

<svelte:head>
	<title>Add Building - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/buildings"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Buildings
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Building</h1>
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
		<BuildingForm
			{values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			campusOptions={data.campusOptions}
			complexOptions={data.complexOptions}
			submitLabel="Create Building"
			cancelHref="/buildings"
			{submitting}
		/>
	</form>
</div>
