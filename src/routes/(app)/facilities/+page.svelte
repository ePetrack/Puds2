<script lang="ts">
	let { data } = $props();
	const c = $derived(data.counts);

	const levels = $derived([
		{
			name: 'Campuses',
			icon: '🎓',
			href: '/campuses',
			count: c.campuses,
			blurb: 'Optional grouping of buildings — a university campus or federal installation.'
		},
		{
			name: 'Complexes',
			icon: '🏘️',
			href: '/complexes',
			count: c.complexes,
			blurb: 'A premise where multiple buildings share one master meter ("Campus" in DOE BEDES).'
		},
		{
			name: 'Buildings',
			icon: '🏛️',
			href: '/buildings',
			count: c.buildings,
			blurb: 'A single structure enclosed within exterior walls and a roof.'
		},
		{
			name: 'Meters',
			icon: '🔢',
			href: '/utilities/meters',
			count: c.meters,
			blurb:
				'Attached to exactly one premise — a building or a complex. Submeters hang off a parent.'
		}
	]);
</script>

<svelte:head>
	<title>Facility Management - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Facility Management</h1>
		<p class="text-gray-600 dark:text-gray-400">
			The physical built environment — campuses, complexes, buildings, and their meters.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each levels as level (level.href)}
			<a href={level.href} class="card block p-6 transition hover:shadow-md">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-3xl">{level.icon}</span>
					<span class="text-3xl font-bold text-gray-900 dark:text-white">{level.count}</span>
				</div>
				<h2 class="mb-1 font-semibold text-primary-600 dark:text-primary-400">{level.name}</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">{level.blurb}</p>
			</a>
		{/each}
	</div>

	<div class="card p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
			How the hierarchy works
		</h2>
		<pre
			class="overflow-x-auto rounded bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">Client
 └── Campus            (optional grouping)
      └── Complex       (optional premise: buildings on one master meter)
           └── Building  (a single structure)
                └── Meter ── premise is a Building XOR a Complex
                     └── Submeter (same utility type as its parent)</pre>
		<ul class="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
			<li>
				• Campus and Complex are both <strong>optional</strong> — a building can belong to either, both,
				or neither.
			</li>
			<li>
				• A meter serves <strong>exactly one</strong> premise. Complex meters are masters serving
				several buildings ({c.complexMeters} today).
			</li>
			<li>
				• Submeters reference a parent meter of the same utility type ({c.submeters} today).
			</li>
		</ul>
	</div>

	<div class="card p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Add to the hierarchy</h2>
		<div class="flex flex-wrap gap-3">
			<a href="/campuses/new" class="btn btn-secondary">+ Campus</a>
			<a href="/complexes/new" class="btn btn-secondary">+ Complex</a>
			<a href="/buildings/new" class="btn btn-secondary">+ Building</a>
			<a href="/utilities/meters/new" class="btn btn-secondary">+ Meter</a>
		</div>
	</div>
</div>
