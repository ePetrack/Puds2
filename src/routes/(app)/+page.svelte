<script lang="ts">
  import { currentUser } from '$lib/pocketbase';
  import { onMount } from 'svelte';

  let stats = $state({
    activeProjects: 0,
    totalClients: 0,
    annualSavings: 0,
    pendingTasks: 0,
  });

  onMount(async () => {
    // In a real app, fetch these stats from the database
    // For now, using placeholder data
    stats = {
      activeProjects: 12,
      totalClients: 8,
      annualSavings: 245000,
      pendingTasks: 23,
    };
  });
</script>

<svelte:head>
  <title>Dashboard - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
  <!-- Welcome Section -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Welcome back, {$currentUser?.name || 'User'}!
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Here's what's happening with your energy management projects today.
    </p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div class="card p-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</h3>
        <span class="text-2xl">📋</span>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</p>
      <p class="text-sm text-green-600 dark:text-green-400 mt-2">↑ 2 from last month</p>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</h3>
        <span class="text-2xl">🏢</span>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalClients}</p>
      <p class="text-sm text-green-600 dark:text-green-400 mt-2">↑ 1 new this month</p>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Annual Savings</h3>
        <span class="text-2xl">💰</span>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">
        ${stats.annualSavings.toLocaleString()}
      </p>
      <p class="text-sm text-green-600 dark:text-green-400 mt-2">↑ 12% vs target</p>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Tasks</h3>
        <span class="text-2xl">✓</span>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingTasks}</p>
      <p class="text-sm text-yellow-600 dark:text-yellow-400 mt-2">5 due this week</p>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Projects</h2>
      <div class="space-y-4">
        <div class="border-l-4 border-primary-500 pl-4">
          <h3 class="font-medium text-gray-900 dark:text-white">HVAC Upgrade - Building A</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Status: In Progress</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Expected Savings: $45,000/year</p>
        </div>
        <div class="border-l-4 border-green-500 pl-4">
          <h3 class="font-medium text-gray-900 dark:text-white">LED Lighting Retrofit</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Status: Completed</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Actual Savings: $28,500/year</p>
        </div>
        <div class="border-l-4 border-yellow-500 pl-4">
          <h3 class="font-medium text-gray-900 dark:text-white">Energy Audit - Campus Wide</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Status: Planning</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Scheduled: Next Month</p>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div class="grid grid-cols-2 gap-4">
        <a href="/projects" class="btn btn-primary text-center">
          New Project
        </a>
        <a href="/audits" class="btn btn-secondary text-center">
          Schedule Audit
        </a>
        <a href="/energy-data" class="btn btn-secondary text-center">
          View Energy Data
        </a>
        <a href="/analysis" class="btn btn-secondary text-center">
          Run Analysis
        </a>
      </div>

      <div class="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <h3 class="font-medium text-primary-900 dark:text-primary-100 mb-2">
          💡 Getting Started
        </h3>
        <p class="text-sm text-primary-700 dark:text-primary-300">
          Check out the <a href="/analysis" class="underline">Analysis</a> page to see Perspective.js in action with energy data visualization.
        </p>
      </div>
    </div>
  </div>
</div>
