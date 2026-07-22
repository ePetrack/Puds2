<script lang="ts">
	import { enhance } from '$app/forms';
	import BuildingForm from '$lib/components/buildings/BuildingForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.buildingName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/buildings/{data.buildingId}"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to {data.buildingName}
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Building</h1>
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
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			submitLabel="Save Changes"
			cancelHref="/buildings/{data.buildingId}"
			{submitting}
		/>
	</form>
</div>
