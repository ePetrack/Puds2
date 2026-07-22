<script lang="ts">
	let { data } = $props();

	function typeLabel(value: string | null) {
		if (!value) return '-';
		return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<svelte:head>
	<title>{data.building.name} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a
				href="/buildings"
				class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
			>
				← Back to Buildings
			</a>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{data.building.name}</h1>
			{#if data.building.client}
				<p class="mt-1 text-gray-600 dark:text-gray-400">
					<a
						href="/clients/{data.building.client.id}"
						class="text-primary-600 hover:underline dark:text-primary-400"
					>
						{data.building.client.name}
					</a>
				</p>
			{/if}
		</div>
		<a href="/buildings/{data.building.id}/edit" class="btn btn-secondary">Edit</a>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Building Details</h2>
				<dl class="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Type</dt>
						<dd class="text-gray-900 dark:text-white">{typeLabel(data.building.buildingType)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Square Footage</dt>
						<dd class="text-gray-900 dark:text-white">
							{data.building.squareFootage?.toLocaleString() ?? '-'}
						</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Year Built</dt>
						<dd class="text-gray-900 dark:text-white">{data.building.yearBuilt ?? '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Floors</dt>
						<dd class="text-gray-900 dark:text-white">{data.building.floors ?? '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Occupancy</dt>
						<dd class="text-gray-900 dark:text-white">{data.building.occupancy ?? '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Address</dt>
						<dd class="text-gray-900 dark:text-white">{data.building.address || '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Campus</dt>
						<dd class="text-gray-900 dark:text-white">
							{#if data.building.campusId && data.building.campusName}
								<a
									href="/campuses/{data.building.campusId}"
									class="text-primary-600 hover:underline dark:text-primary-400"
								>
									{data.building.campusName}
								</a>
							{:else}
								-
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Complex</dt>
						<dd class="text-gray-900 dark:text-white">
							{#if data.building.complexId && data.building.complexName}
								<a
									href="/complexes/{data.building.complexId}"
									class="text-primary-600 hover:underline dark:text-primary-400"
								>
									{data.building.complexName}
								</a>
							{:else}
								-
							{/if}
						</dd>
					</div>
				</dl>
			</div>

			{#if data.building.notes}
				<div class="card p-6">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
					<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{data.building.notes}
					</p>
				</div>
			{/if}
		</div>

		<div class="space-y-6">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Energy data, meters, and utility accounts for this building arrive in upcoming milestones.
				</p>
			</div>
		</div>
	</div>
</div>
