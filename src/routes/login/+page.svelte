<script lang="ts">
  import { auth } from '$lib/pocketbase';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      await auth.login(email, password);
      goto('/');
    } catch (err: any) {
      error = err.message || 'Login failed. Please check your credentials.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Energy Management Platform</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
  <div class="max-w-md w-full">
    <div class="card p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Energy Management Platform
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Sign in to access your dashboard
        </p>
      </div>

      {#if error}
        <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      {/if}

      <form onsubmit={handleLogin}>
        <div class="mb-4">
          <label for="email" class="label">Email</label>
          <input
            type="email"
            id="email"
            class="input"
            bind:value={email}
            required
            disabled={loading}
            placeholder="you@university.edu"
          />
        </div>

        <div class="mb-6">
          <label for="password" class="label">Password</label>
          <input
            type="password"
            id="password"
            class="input"
            bind:value={password}
            required
            disabled={loading}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Demo: admin@demo.com / admin123
        </p>
      </div>
    </div>

    <div class="mt-8 text-center text-white/80 text-sm">
      <p>Energy Management Consultancy Platform v1.0</p>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
  }
</style>
