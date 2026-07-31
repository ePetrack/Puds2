<script lang="ts">
	import { page } from '$app/stores';

	// Errors outside the app shell — an unauthenticated 404, a failure in the root layout.
	let status = $derived($page.status);
	let message = $derived($page.error?.message ?? 'Something went wrong.');
	let requestId = $derived($page.error?.requestId);
</script>

<svelte:head>
	<title>{status} - Energy Management Platform</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
	<div class="card max-w-lg space-y-4 p-8 text-center">
		<p class="text-5xl font-bold text-gray-300 dark:text-gray-600">{status}</p>
		<h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
			{status === 404 ? 'Page not found' : 'Something went wrong'}
		</h1>
		<p class="text-gray-600 dark:text-gray-400">{message}</p>

		{#if requestId}
			<!-- The id this failure was logged under; quoting it is what makes it findable. -->
			<p class="text-xs text-gray-500 dark:text-gray-500">
				Reference: <code class="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">{requestId}</code>
			</p>
		{/if}

		<a href="/" class="btn btn-primary inline-block">Back to dashboard</a>
	</div>
</div>
