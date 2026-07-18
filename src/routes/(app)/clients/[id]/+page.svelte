<script lang="ts">
	let { data } = $props();

	function formatDate(value: string | null) {
		if (!value) return '-';
		return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatCurrency(value: string | null) {
		if (!value) return '-';
		return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}

	function typeLabel(value: string | null) {
		if (!value) return '-';
		return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<svelte:head>
	<title>{data.client.name} - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<a
				href="/clients"
				class="mb-2 inline-block text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
			>
				← Back to Clients
			</a>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{data.client.name}</h1>
			<p class="mt-1 capitalize text-gray-600 dark:text-gray-400">{data.client.status}</p>
		</div>
		<a href="/clients/{data.client.id}/edit" class="btn btn-secondary">Edit</a>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
				<dl class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Contact Name</dt>
						<dd class="text-gray-900 dark:text-white">{data.client.contactName || '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Email</dt>
						<dd class="text-gray-900 dark:text-white">{data.client.contactEmail || '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Phone</dt>
						<dd class="text-gray-900 dark:text-white">{data.client.contactPhone || '-'}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Address</dt>
						<dd class="text-gray-900 dark:text-white">
							{[data.client.address, data.client.city, data.client.state, data.client.zip]
								.filter(Boolean)
								.join(', ') || '-'}
						</dd>
					</div>
				</dl>
			</div>

			<div class="card overflow-hidden">
				<div class="flex items-center justify-between p-6 pb-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						Buildings ({data.buildings.length})
					</h2>
					<a href="/buildings/new?client={data.client.id}" class="btn btn-secondary text-sm">
						+ Add Building
					</a>
				</div>
				{#if data.buildings.length === 0}
					<p class="px-6 pb-6 text-sm text-gray-500 dark:text-gray-400">
						No buildings registered for this client yet.
					</p>
				{:else}
					<table class="w-full">
						<thead class="bg-gray-50 dark:bg-gray-800">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
									>Name</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
									>Type</th
								>
								<th
									class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
									>Sq Ft</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
							{#each data.buildings as building (building.id)}
								<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
									<td class="whitespace-nowrap px-6 py-3">
										<a
											href="/buildings/{building.id}"
											class="text-sm font-medium text-primary-600 hover:text-primary-900 dark:text-primary-400"
										>
											{building.name}
										</a>
									</td>
									<td class="whitespace-nowrap px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
										{typeLabel(building.buildingType)}
									</td>
									<td
										class="whitespace-nowrap px-6 py-3 text-right text-sm text-gray-900 dark:text-gray-100"
									>
										{building.squareFootage?.toLocaleString() ?? '-'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			{#if data.client.notes}
				<div class="card p-6">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
					<p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{data.client.notes}
					</p>
				</div>
			{/if}
		</div>

		<div class="space-y-6">
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contract</h2>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Start Date</dt>
						<dd class="text-gray-900 dark:text-white">
							{formatDate(data.client.contractStartDate)}
						</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">End Date</dt>
						<dd class="text-gray-900 dark:text-white">{formatDate(data.client.contractEndDate)}</dd>
					</div>
					<div>
						<dt class="text-gray-500 dark:text-gray-400">Contract Value</dt>
						<dd class="text-lg font-semibold text-gray-900 dark:text-white">
							{formatCurrency(data.client.contractValue)}
						</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>
</div>
