<script lang="ts">
	let { data } = $props();

	function formatWhen(value: string | Date) {
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	const actionLabels: Record<string, string> = {
		create: 'created',
		update: 'updated',
		delete: 'deleted'
	};
</script>

<svelte:head>
	<title>Dashboard - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
		<p class="text-gray-600 dark:text-gray-400">Portfolio overview</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<a href="/clients" class="card p-6 transition-shadow hover:shadow-md">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Clients</p>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">{data.stats.clients}</p>
		</a>
		<a href="/buildings" class="card p-6 transition-shadow hover:shadow-md">
			<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">Buildings</p>
			<p class="text-3xl font-bold text-gray-900 dark:text-white">{data.stats.buildings}</p>
		</a>
	</div>

	<div class="card p-6">
		<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
		{#if data.recentActivity.length === 0}
			<p class="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
				No activity yet. Create your first client to get started.
			</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.recentActivity as entry (entry.id)}
					<li class="flex items-center justify-between gap-4 py-2.5 text-sm">
						<span class="text-gray-700 dark:text-gray-300">
							<strong>{entry.actorName ?? 'System'}</strong>
							{actionLabels[entry.action] ?? entry.action} a {entry.entity}
						</span>
						<span class="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
							{formatWhen(entry.createdAt)}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
