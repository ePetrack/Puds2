<script lang="ts">
	import { onMount } from 'svelte';
	import '@finos/perspective-viewer/dist/css/themes.css';

	interface Props {
		data: object[];
		config?: Record<string, unknown>;
	}

	let { data, config }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let viewerEl: any = $state();
	let ready = $state(false);
	let loadError = $state('');

	onMount(() => {
		let cancelled = false;

		(async () => {
			try {
				// Client-only: Perspective is WASM-backed and must never run during SSR
				await import('@finos/perspective-viewer');
				await import('@finos/perspective-viewer-datagrid');
				await import('@finos/perspective-viewer-d3fc');
				const perspective = (await import('@finos/perspective')).default;

				const worker = await perspective.worker();
				const table = await worker.table(data as Record<string, unknown>[]);
				if (cancelled) return;

				await viewerEl.load(table);
				if (config) {
					await viewerEl.restore(config);
				}
				ready = true;
			} catch (err) {
				loadError = err instanceof Error ? err.message : 'Failed to load the analysis engine';
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	// Apply preset changes after initial load
	$effect(() => {
		const cfg = config;
		if (ready && cfg && viewerEl) {
			viewerEl.restore(cfg);
		}
	});
</script>

{#if loadError}
	<div
		class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200"
		role="alert"
	>
		{loadError}
	</div>
{:else}
	<div class="relative h-[600px] w-full">
		{#if !ready}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
			</div>
		{/if}
		<perspective-viewer bind:this={viewerEl} class="h-full w-full" theme="Pro Light"
		></perspective-viewer>
	</div>
{/if}
