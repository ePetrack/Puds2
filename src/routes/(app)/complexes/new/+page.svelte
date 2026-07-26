<script lang="ts">
	import { enhance } from '$app/forms';
	import ComplexForm from '$lib/components/complexes/ComplexForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	// When arriving from a campus, preselect that campus and its client.
	const preselectedCampusOption = $derived(
		data.campusOptions.find((c) => c.id === data.preselectedCampus)
	);
	let values = $derived(
		form?.values ?? {
			campusId: data.preselectedCampus,
			clientId: preselectedCampusOption?.clientId ?? ''
		}
	);
</script>

<svelte:head>
	<title>Add Complex - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/complexes"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Complexes
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Complex</h1>
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
			{values}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			campusOptions={data.campusOptions}
			submitLabel="Create Complex"
			cancelHref="/complexes"
			{submitting}
		/>
	</form>
</div>
