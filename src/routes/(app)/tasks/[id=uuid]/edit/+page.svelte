<script lang="ts">
	import { enhance } from '$app/forms';
	import TaskForm from '$lib/components/tasks/TaskForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit Task - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a
			href="/tasks"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Tasks
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Task</h1>
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
		<TaskForm
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			userOptions={data.userOptions}
			projectOptions={data.projectOptions}
			clientOptions={data.clientOptions}
			submitLabel="Save Changes"
			cancelHref="/tasks"
			{submitting}
		/>
	</form>
</div>
