<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	interface Props {
		open: boolean;
		title: string;
		onclose?: () => void;
		children: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let { open = $bindable(), title, onclose, children, actions }: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/50" onclick={handleClose} aria-hidden="true"></div>

		<!-- Modal -->
		<div
			class="relative card max-w-2xl w-full max-h-[90vh] overflow-auto"
			transition:fly={{ y: -50, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
			>
				<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
					{title}
				</h2>
				<button
					onclick={handleClose}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
				>
					×
				</button>
			</div>

			<!-- Content -->
			<div class="p-6">
				{@render children()}
			</div>

			<!-- Actions -->
			{#if actions}
				<div
					class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700"
				>
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
{/if}
