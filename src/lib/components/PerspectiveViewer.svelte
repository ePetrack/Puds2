<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type perspective from '@finos/perspective';

  interface Props {
    data: any[];
    config?: any;
    class?: string;
  }

  let { data, config = {}, class: className = '' }: Props = $props();

  let container: HTMLDivElement;
  let viewer: any;
  let worker: any;
  let table: any;

  onMount(async () => {
    try {
      // Dynamically import Perspective
      const perspectiveModule = await import('@finos/perspective');
      await import('@finos/perspective-viewer');
      await import('@finos/perspective-viewer-datagrid');
      await import('@finos/perspective-viewer-d3fc');

      // Create worker and table
      worker = perspectiveModule.default.worker();
      table = await worker.table(data);

      // Create viewer element
      viewer = document.createElement('perspective-viewer');
      container.appendChild(viewer);

      // Load the table
      await viewer.load(table);

      // Apply configuration if provided
      if (config && Object.keys(config).length > 0) {
        await viewer.restore(config);
      } else {
        // Default configuration for energy data
        await viewer.restore({
          plugin: 'Datagrid',
          columns: Object.keys(data[0] || {}),
          group_by: [],
          split_by: [],
          aggregates: {},
          filter: [],
          sort: [],
        });
      }

      // Style the viewer for dark mode support
      viewer.classList.add('perspective-viewer-material');
    } catch (error) {
      console.error('Error initializing Perspective:', error);
    }
  });

  onDestroy(() => {
    if (viewer) {
      viewer.delete();
    }
    if (table) {
      table.delete();
    }
    if (worker) {
      worker.terminate();
    }
  });

  // Update data when it changes
  $effect(() => {
    if (table && data) {
      table.replace(data);
    }
  });
</script>

<div bind:this={container} class="perspective-container {className}"></div>

<style>
  .perspective-container {
    width: 100%;
    height: 100%;
    min-height: 600px;
    position: relative;
  }

  :global(perspective-viewer) {
    position: absolute;
    inset: 0;
  }

  /* Dark mode support */
  :global(.dark perspective-viewer) {
    --theme--color: #e5e7eb;
    --theme--background: #1f2937;
  }
</style>
