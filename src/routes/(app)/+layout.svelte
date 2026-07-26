<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { data, children } = $props();
	let sidebarOpen = $state(true);
	let darkMode = $state(false);

	onMount(() => {
		const savedDarkMode = localStorage.getItem('darkMode') === 'true';
		darkMode = savedDarkMode;
		updateDarkMode(savedDarkMode);
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
		localStorage.setItem('darkMode', String(darkMode));
		updateDarkMode(darkMode);
	}

	function updateDarkMode(isDark: boolean) {
		document.documentElement.classList.toggle('dark', isDark);
	}

	const navigation = [
		{ name: 'Dashboard', href: '/', icon: '📊' },
		{ name: 'Clients', href: '/clients', icon: '🏢' },
		{ name: 'Campuses', href: '/campuses', icon: '🎓' },
		{ name: 'Complexes', href: '/complexes', icon: '🏘️' },
		{ name: 'Buildings', href: '/buildings', icon: '🏛️' },
		{ name: 'Projects', href: '/projects', icon: '📋' },
		{ name: 'Utilities', href: '/utilities', icon: '💡' },
		{ name: 'Energy Data', href: '/energy', icon: '⚡' },
		{ name: 'Analysis', href: '/analysis', icon: '📈' },
		{ name: 'Tasks', href: '/tasks', icon: '✅' },
		{ name: 'Documents', href: '/documents', icon: '📁' }
	];

	function isActive(href: string) {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Sidebar -->
	<aside
		class="border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
		class:w-64={sidebarOpen}
		class:w-20={!sidebarOpen}
	>
		<div class="flex h-full flex-col">
			<div
				class="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700"
			>
				{#if sidebarOpen}
					<h1 class="text-xl font-bold text-primary-600 dark:text-primary-400">EMP</h1>
				{:else}
					<span class="text-2xl">⚡</span>
				{/if}
				<button
					onclick={() => (sidebarOpen = !sidebarOpen)}
					class="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				>
					{sidebarOpen ? '«' : '»'}
				</button>
			</div>

			<nav class="flex-1 space-y-1 overflow-y-auto p-4">
				{#each navigation as item (item.href)}
					<a href={item.href} class="sidebar-link" class:sidebar-link-active={isActive(item.href)}>
						<span class="text-xl">{item.icon}</span>
						{#if sidebarOpen}
							<span>{item.name}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="border-t border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-3 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900"
					>
						<span class="font-semibold text-primary-600 dark:text-primary-400">
							{data.user.name.charAt(0).toUpperCase()}
						</span>
					</div>
					{#if sidebarOpen}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
								{data.user.name}
							</p>
							<p class="truncate text-xs text-gray-500 dark:text-gray-400">{data.user.role}</p>
						</div>
					{/if}
				</div>

				<div class="space-y-2" class:flex={!sidebarOpen} class:flex-col={!sidebarOpen}>
					<button
						onclick={toggleDarkMode}
						class="btn btn-secondary w-full text-sm"
						title={darkMode ? 'Light mode' : 'Dark mode'}
					>
						{#if sidebarOpen}{darkMode ? '☀️ Light' : '🌙 Dark'}{:else}{darkMode ? '☀️' : '🌙'}{/if}
					</button>
					<form method="POST" action="/logout">
						<button type="submit" class="btn btn-secondary w-full text-sm" title="Logout">
							{#if sidebarOpen}Logout{:else}🚪{/if}
						</button>
					</form>
				</div>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<header
			class="flex h-16 items-center border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
				{navigation.find((n) => isActive(n.href))?.name || 'Energy Management Platform'}
			</h2>
		</header>

		<main class="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
			{@render children()}
		</main>
	</div>
</div>

<Toast />
