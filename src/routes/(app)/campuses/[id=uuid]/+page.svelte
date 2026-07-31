<script lang="ts">
	let { data } = $props();
	const campus = $derived(data.campus);

	const location = $derived(
		[campus.address, campus.city, campus.state, campus.zip].filter(Boolean).join(', ')
	);
</script>

<svelte:head>
	<title>{campus.name} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<a
			href="/campuses"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Campuses
		</a>
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{campus.name}</h1>
			<a href="/campuses/{campus.id}/edit" class="btn btn-secondary">Edit</a>
		</div>
	</div>

	<div class="card space-y-4 p-6">
		<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Client</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">
					{#if campus.client}
						<a
							href="/clients/{campus.client.id}"
							class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
						>
							{campus.client.name}
						</a>
					{:else}
						-
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Code</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">{campus.code ?? '-'}</dd>
			</div>
			<div class="sm:col-span-2">
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">{location || '-'}</dd>
			</div>
			{#if campus.notes}
				<div class="sm:col-span-2">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
					<dd class="mt-1 whitespace-pre-wrap text-gray-900 dark:text-white">{campus.notes}</dd>
				</div>
			{/if}
		</dl>
	</div>

	<div class="card p-6">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Complexes</h2>
			<a
				href="/complexes/new?campus={campus.id}"
				class="text-sm text-primary-600 dark:text-primary-400">+ Add Complex</a
			>
		</div>
		{#if data.complexes.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">No complexes in this campus yet.</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.complexes as complex (complex.id)}
					<li class="py-2">
						<a
							href="/complexes/{complex.id}"
							class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
						>
							{complex.name}
						</a>
						{#if complex.code}<span class="ml-2 text-sm text-gray-500">({complex.code})</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="card p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Buildings</h2>
		{#if data.buildings.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				No buildings assigned to this campus yet.
			</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.buildings as building (building.id)}
					<li class="py-2">
						<a
							href="/buildings/{building.id}"
							class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
						>
							{building.name}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
