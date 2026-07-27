<script lang="ts">
	// Placeholder: plants and distributed energy/water resources have no data model yet.
	// The nav slot exists so the information architecture is settled; the schema is
	// deliberately left for a dedicated milestone.
	const planned = [
		{
			icon: '🏭',
			name: 'Central plants',
			blurb: 'Steam, chilled water, and hot water plants serving a campus or complex.'
		},
		{
			icon: '☀️',
			name: 'Solar PV',
			blurb: 'On-site generation with capacity ratings and export back to the grid.'
		},
		{
			icon: '🔋',
			name: 'Storage',
			blurb: 'Battery systems — charge and discharge, not just one-directional consumption.'
		},
		{
			icon: '⚡',
			name: 'Cogeneration / CHP',
			blurb: 'Fuel input measured against both electrical and thermal output.'
		},
		{
			icon: '💧',
			name: 'Water resources',
			blurb: 'Wells, reclaimed water, and on-site treatment.'
		}
	];
</script>

<svelte:head>
	<title>Plant Management - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Plant Management</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Plants and distributed energy &amp; water resources.
		</p>
	</div>

	<div
		class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30"
	>
		<p class="text-sm text-amber-900 dark:text-amber-200">
			<strong>Not built yet.</strong> Generation assets need a data model distinct from consumption meters
			— bidirectional flow, capacity ratings, and fuel input measured against output. Rather than force
			them into the existing meter schema, this is scoped as its own milestone. The navigation entry is
			here so the structure is settled first.
		</p>
	</div>

	<div class="card p-6">
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">What this will cover</h2>
		<ul class="space-y-4">
			{#each planned as item (item.name)}
				<li class="flex gap-3">
					<span class="text-2xl">{item.icon}</span>
					<div>
						<p class="font-medium text-gray-900 dark:text-white">{item.name}</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">{item.blurb}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>

	<div class="card p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">In the meantime</h2>
		<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
			Central plant loads can be tracked today as a complex master meter, with building submeters
			beneath it.
		</p>
		<div class="flex flex-wrap gap-3">
			<a href="/facilities" class="btn btn-secondary">Facility Management</a>
			<a href="/utilities/meters" class="btn btn-secondary">Meters</a>
		</div>
	</div>
</div>
