<script lang="ts">
	import PerspectiveViewer from '$lib/components/PerspectiveViewer.svelte';

	let { data } = $props();

	const presets: { name: string; description: string; config: Record<string, unknown> }[] = [
		{
			name: 'Data Grid',
			description: 'All bill and reading records',
			config: {
				plugin: 'Datagrid',
				group_by: [],
				split_by: [],
				columns: [
					'record_type',
					'date',
					'client',
					'building',
					'utility_type',
					'usage',
					'unit',
					'demand_kw',
					'cost'
				]
			}
		},
		{
			name: 'Cost by Month',
			description: 'Monthly spend split by utility type',
			config: {
				plugin: 'Y Line',
				group_by: ['month'],
				split_by: ['utility_type'],
				columns: ['cost'],
				aggregates: { cost: 'sum' },
				filter: [['record_type', '==', 'bill']]
			}
		},
		{
			name: 'Usage by Building',
			description: 'Total consumption per building and type',
			config: {
				plugin: 'Y Bar',
				group_by: ['building'],
				split_by: ['utility_type'],
				columns: ['usage'],
				aggregates: { usage: 'sum' },
				filter: [['record_type', '==', 'reading']]
			}
		},
		{
			name: 'Demand Profile',
			description: 'Peak demand across months',
			config: {
				plugin: 'Y Line',
				group_by: ['month'],
				split_by: ['building'],
				columns: ['demand_kw'],
				aggregates: { demand_kw: 'max' },
				filter: [['record_type', '==', 'reading']]
			}
		}
	];

	let activePreset = $state(0);
</script>

<svelte:head>
	<title>Analysis - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Analysis</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Interactive pivoting over {data.records.length.toLocaleString()} bill and reading records (trailing
			24 months). Drag columns to group, split, and aggregate.
		</p>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each presets as preset, i (preset.name)}
			<button
				onclick={() => (activePreset = i)}
				class="rounded-lg border px-4 py-2 text-left text-sm transition-colors
					{activePreset === i
					? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
					: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'}"
			>
				<span class="block font-medium">{preset.name}</span>
				<span class="block text-xs opacity-70">{preset.description}</span>
			</button>
		{/each}
	</div>

	<div class="card overflow-hidden p-2">
		{#if data.records.length === 0}
			<p class="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
				No bills or readings recorded yet — add some to analyze.
			</p>
		{:else}
			<PerspectiveViewer data={data.records} config={presets[activePreset].config} />
		{/if}
	</div>
</div>
