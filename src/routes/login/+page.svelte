<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign In - Energy Management Platform</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<div class="mb-2 text-5xl">⚡</div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Energy Management Platform</h1>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Sign in to your account</p>
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
			class="card space-y-4 p-6"
		>
			{#if form?.error}
				<div
					class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200"
					role="alert"
				>
					{form.error}
				</div>
			{/if}

			<div>
				<label class="label" for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					autocomplete="email"
					value={form?.email ?? ''}
					class="input"
					placeholder="you@example.com"
				/>
			</div>

			<div>
				<label class="label" for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="input"
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" disabled={submitting} class="btn btn-primary w-full">
				{submitting ? 'Signing in...' : 'Sign In'}
			</button>
		</form>
	</div>
</div>
