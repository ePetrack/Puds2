<script lang="ts">
  import { currentUser, auth } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let { children } = $props();
  let sidebarOpen = $state(true);
  let darkMode = $state(false);

  // Check if user is authenticated
  onMount(() => {
    if (!auth.isAuthenticated()) {
      goto('/login');
    }

    // Check for dark mode preference
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      darkMode = savedDarkMode;
      updateDarkMode(savedDarkMode);
    }
  });

  async function handleLogout() {
    await auth.logout();
    goto('/login');
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', String(darkMode));
    updateDarkMode(darkMode);
  }

  function updateDarkMode(isDark: boolean) {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Clients', href: '/clients', icon: '🏢' },
    { name: 'Projects', href: '/projects', icon: '📋' },
    { name: 'Buildings', href: '/buildings', icon: '🏛️' },
    { name: 'Energy Data', href: '/energy-data', icon: '⚡' },
    { name: 'Audits', href: '/audits', icon: '🔍' },
    { name: 'Equipment', href: '/equipment', icon: '⚙️' },
    { name: 'Reports', href: '/reports', icon: '📄' },
    { name: 'Tasks', href: '/tasks', icon: '✓' },
    { name: 'Documents', href: '/documents', icon: '📁' },
    { name: 'Analysis', href: '/analysis', icon: '📈' },
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
    class="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
    class:w-64={sidebarOpen}
    class:w-20={!sidebarOpen}
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {#if sidebarOpen}
          <h1 class="text-xl font-bold text-primary-600 dark:text-primary-400">EMP</h1>
        {:else}
          <span class="text-2xl">⚡</span>
        {/if}
        <button
          onclick={() => sidebarOpen = !sidebarOpen}
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? '«' : '»'}
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        {#each navigation as item}
          <a
            href={item.href}
            class="sidebar-link"
            class:sidebar-link-active={isActive(item.href)}
          >
            <span class="text-xl">{item.icon}</span>
            {#if sidebarOpen}
              <span>{item.name}</span>
            {/if}
          </a>
        {/each}
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        {#if $currentUser}
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span class="text-primary-600 dark:text-primary-400 font-semibold">
                {$currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {#if sidebarOpen}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {$currentUser.name}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {$currentUser.role}
                </p>
              </div>
            {/if}
          </div>
        {/if}

        {#if sidebarOpen}
          <div class="space-y-2">
            <button
              onclick={toggleDarkMode}
              class="w-full btn btn-secondary text-sm"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onclick={handleLogout}
              class="w-full btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        {:else}
          <div class="space-y-2 flex flex-col items-center">
            <button
              onclick={toggleDarkMode}
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onclick={handleLogout}
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Logout"
            >
              🚪
            </button>
          </div>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
        {navigation.find(n => isActive(n.href))?.name || 'Energy Management Platform'}
      </h2>
    </header>

    <!-- Page Content -->
    <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
      {@render children?.()}
    </main>
  </div>
</div>
