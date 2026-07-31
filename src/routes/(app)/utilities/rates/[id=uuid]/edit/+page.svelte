<script lang="ts">
	import { enhance } from '$app/forms';
	import RateForm from '$lib/components/utilities/RateForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Edit {data.rateName} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/rates"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Rate Schedules
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Rate Schedule</h1>
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
		<RateForm
			values={form?.values ?? data.values}
			errors={form?.errors ?? {}}
			providerOptions={data.providerOptions}
			submitLabel="Save Changes"
			cancelHref="/utilities/rates"
			{submitting}
		/>
	</form>
</div>
