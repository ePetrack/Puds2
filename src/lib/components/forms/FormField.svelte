<script lang="ts">
	interface Props {
		label: string;
		error?: string;
		required?: boolean;
		hint?: string;
		children: import('svelte').Snippet;
	}

	let { label, error, required = false, hint, children }: Props = $props();
</script>

<div class="mb-4">
	<!-- Wrapping the control associates the label implicitly (a11y + testability) -->
	<label>
		<span class="label">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</span>
		{@render children()}
	</label>

	{#if hint && !error}
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
	{/if}

	{#if error}
		<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
	{/if}
</div>
