<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';

	const icons = {
		success: '✓',
		error: '✕',
		info: 'ℹ',
		warning: '⚠'
	};

	const colors = {
		success: 'bg-green-500',
		error: 'bg-red-500',
		info: 'bg-blue-500',
		warning: 'bg-yellow-500'
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
	{#each $toast as item (item.id)}
		<div
			transition:fly={{ x: 300, duration: 300 }}
			class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] max-w-[500px] {colors[
				item.type
			]}"
		>
			<span class="text-xl font-bold">{icons[item.type]}</span>
			<p class="flex-1 text-sm">{item.message}</p>
			<button
				onclick={() => toast.remove(item.id)}
				class="text-white/80 hover:text-white transition-colors"
			>
				✕
			</button>
		</div>
	{/each}
</div>
