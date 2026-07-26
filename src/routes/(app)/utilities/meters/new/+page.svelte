<script lang="ts">
	import { enhance } from '$app/forms';
	import MeterForm from '$lib/components/utilities/MeterForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Add Meter - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/meters"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Meters
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Meter</h1>
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
		<MeterForm
			values={form?.values ?? {}}
			errors={form?.errors ?? {}}
			buildingOptions={data.buildingOptions}
			complexOptions={data.complexOptions}
			parentMeterOptions={data.parentMeterOptions}
			accountOptions={data.accountOptions}
			submitLabel="Create Meter"
			cancelHref="/utilities/meters"
			{submitting}
		/>
	</form>
</div>
