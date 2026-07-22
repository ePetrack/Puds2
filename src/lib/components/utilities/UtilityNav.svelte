<script lang="ts">
	import { page } from '$app/stores';

	const tabs = [
		{ name: 'Overview', href: '/utilities' },
		{ name: 'Bills', href: '/utilities/bills' },
		{ name: 'Accounts', href: '/utilities/accounts' },
		{ name: 'Meters', href: '/utilities/meters' },
		{ name: 'Rate Schedules', href: '/utilities/rates' },
		{ name: 'Providers', href: '/utilities/providers' }
	];

	function isActive(href: string) {
		if (href === '/utilities') {
			return $page.url.pathname === '/utilities';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="border-b border-gray-200 dark:border-gray-700">
	<nav class="-mb-px flex gap-6 overflow-x-auto">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors
					{isActive(tab.href)
					? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				{tab.name}
			</a>
		{/each}
	</nav>
</div>
