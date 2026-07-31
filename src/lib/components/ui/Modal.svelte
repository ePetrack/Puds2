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

	let dialogEl = $state<HTMLDivElement>();
	/** Whatever had focus before the dialog opened, so it can be handed back on close. */
	let previouslyFocused: HTMLElement | null = null;

	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	const focusable = () => Array.from(dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

	/**
	 * `aria-modal="true"` is a promise that the rest of the page is inert. Without a focus
	 * trap the browser keeps focus on the button behind the overlay and Tab walks straight
	 * back into the page underneath, so a keyboard or screen-reader user is told they are in
	 * a dialog while standing outside it.
	 */
	$effect(() => {
		if (!open) return;

		previouslyFocused = document.activeElement as HTMLElement | null;
		// Wait for the transition to mount the content before looking for something to focus.
		queueMicrotask(() => (focusable()[0] ?? dialogEl)?.focus());

		return () => previouslyFocused?.focus?.();
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;

		if (e.key === 'Escape') {
			handleClose();
			return;
		}

		if (e.key !== 'Tab') return;
		const items = focusable();
		if (items.length === 0) return;

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;

		// Wrap at both ends, and pull focus back in if it has escaped the dialog entirely.
		if (e.shiftKey && (active === first || !dialogEl?.contains(active))) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !dialogEl?.contains(active))) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop. Not keyboard-reachable by design: Escape is the keyboard affordance, and
		     a focusable backdrop would just be a tab stop that announces nothing. -->
		<div class="absolute inset-0 bg-black/50" onclick={handleClose} aria-hidden="true"></div>

		<!-- Modal -->
		<div
			bind:this={dialogEl}
			class="relative card max-h-[90vh] w-full max-w-2xl overflow-auto"
			transition:fly={{ y: -50, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
			>
				<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
					{title}
				</h2>
				<button
					onclick={handleClose}
					aria-label="Close dialog"
					class="text-2xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
					class="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700"
				>
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
{/if}
