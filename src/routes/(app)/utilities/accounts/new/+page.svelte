<script lang="ts">
	import { enhance } from '$app/forms';
	import AccountForm from '$lib/components/utilities/AccountForm.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Add Utility Account - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div>
		<a
			href="/utilities/accounts"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Accounts
		</a>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Add Utility Account</h1>
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
		<AccountForm
			values={form?.values ?? {}}
			errors={form?.errors ?? {}}
			clientOptions={data.clientOptions}
			providerOptions={data.providerOptions}
			rateScheduleOptions={data.rateScheduleOptions}
			submitLabel="Create Account"
			cancelHref="/utilities/accounts"
			{submitting}
		/>
	</form>
</div>
