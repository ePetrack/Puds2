<script lang="ts">
	import { enhance } from '$app/forms';
	import ComplexForm from '$lib/components/complexes/ComplexForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.complexName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/complexes/{data.complexId}"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to {data.complexName}
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Complex</h1>
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
		<ComplexForm
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			campusOptions={data.campusOptions}
			submitLabel="Save Changes"
			cancelHref="/complexes/{data.complexId}"
			{submitting}
		/>
	</form>
</div>
