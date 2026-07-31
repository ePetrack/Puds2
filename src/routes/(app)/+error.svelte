<script lang="ts">
	import { page } from '$app/stores';

	// Inside the app group, so the sidebar and shell stay put — an error on one page shouldn't
	// dump a signed-in user out of the application.
	let status = $derived($page.status);
	let message = $derived($page.error?.message ?? 'Something went wrong.');
	let requestId = $derived($page.error?.requestId);
</script>

<svelte:head>
	<title>{status} - Energy Management Platform</title>
</svelte:head>

<div class="card mx-auto max-w-lg space-y-4 p-8 text-center">
	<p class="text-5xl font-bold text-gray-300 dark:text-gray-600">{status}</p>
	<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
		{status === 404 ? 'Not found' : 'Something went wrong'}
	</h1>
	<p class="text-gray-600 dark:text-gray-400">{message}</p>

	{#if requestId}
		<p class="text-xs text-gray-500 dark:text-gray-500">
			Reference: <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">{requestId}</code>
		</p>
	{/if}

	<div class="flex justify-center gap-3 pt-2">
		<button onclick={() => history.back()} class="btn btn-secondary">Go back</button>
		<a href="/" class="btn btn-primary">Dashboard</a>
	</div>
</div>
