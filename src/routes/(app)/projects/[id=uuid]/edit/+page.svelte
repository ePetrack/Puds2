<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.projectName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/projects/{data.projectId}"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to {data.projectName}
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Project</h1>
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
		<ProjectForm
			values={form?.values ?? data.values}
			selectedBuildings={form?.buildingIds ?? data.selectedBuildings}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			buildingOptions={data.buildingOptions}
			submitLabel="Save Changes"
			cancelHref="/projects/{data.projectId}"
			{submitting}
		/>
	</form>
</div>
