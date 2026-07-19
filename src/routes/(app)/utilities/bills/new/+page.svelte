<script lang="ts">
	import { enhance } from '$app/forms';
	import BillForm from '$lib/components/utilities/BillForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	let values = $derived(form?.values ?? { accountId: data.preselectedAccount });
</script>

<svelte:head>
	<title>Enter Bill - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<a
			href="/utilities/bills"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Bills
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Enter Utility Bill</h1>
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
		<BillForm
			{values}
			errors={form?.errors ?? {}}
			accountOptions={data.accountOptions}
			meterOptions={data.meterOptions}
			submitLabel="Create Bill"
			cancelHref="/utilities/bills"
			{submitting}
		/>
	</form>
</div>
