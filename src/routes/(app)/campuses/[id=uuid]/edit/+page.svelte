<script lang="ts">
	import { enhance } from '$app/forms';
	import CampusForm from '$lib/components/campuses/CampusForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.campusName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/campuses/{data.campusId}"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to {data.campusName}
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Campus</h1>
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
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			submitLabel="Save Changes"
			cancelHref="/campuses/{data.campusId}"
			{submitting}
		/>
	</form>
</div>
