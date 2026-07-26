<script lang="ts">
	import { formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();
	const complex = $derived(data.complex);
</script>

<svelte:head>
	<title>{complex.name} - Energy Management Platform</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<a
			href="/complexes"
			class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
		>
			← Back to Complexes
		</a>
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{complex.name}</h1>
			<a href="/complexes/{complex.id}/edit" class="btn btn-secondary">Edit</a>
		</div>
	</div>

	<div class="card space-y-4 p-6">
		<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Client</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">
					{#if complex.client}
						<a
							href="/clients/{complex.client.id}"
							class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
						>
							{complex.client.name}
						</a>
					{:else}
						-
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Campus</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">{complex.campusName ?? '-'}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Code</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">{complex.code ?? '-'}</dd>
			</div>
			{#if complex.description}
				<div class="sm:col-span-2">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
					<dd class="mt-1 whitespace-pre-wrap text-gray-900 dark:text-white">
						{complex.description}
					</dd>
				</div>
			{/if}
			{#if complex.notes}
				<div class="sm:col-span-2">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
					<dd class="mt-1 whitespace-pre-wrap text-gray-900 dark:text-white">{complex.notes}</dd>
				</div>
			{/if}
		</dl>
	</div>

	<div class="card p-6">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Master Meters</h2>
			<a href="/utilities/meters/new" class="text-sm text-primary-600 dark:text-primary-400"
				>+ Add Meter</a
			>
		</div>
		{#if data.meters.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">No meters serve this complex yet.</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.meters as meter (meter.id)}
					<li class="flex items-center justify-between py-2">
						<a
							href="/utilities/meters/{meter.id}/edit"
							class="text-primary-600 hover:text-primary-900 dark:text-primary-400"
						>
							{meter.meterNumber}
						</a>
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{formatEnumLabel(meter.utilityType)} · {formatEnumLabel(meter.unit)}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="card p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Buildings Served</h2>
		{#if data.buildings.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				No buildings assigned to this complex yet.
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
