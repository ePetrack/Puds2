<script lang="ts">
	import { listHref, type ListFilters } from '$lib/utils/pagination';

	interface Props {
		page: number;
		totalPages: number;
		/** List route the links point at, e.g. `/buildings`. */
		basePath: string;
		/** Active filters, carried through so paging doesn't drop them. */
		filters?: ListFilters;
	}

	let { page, totalPages, basePath, filters = {} }: Props = $props();
</script>

{#if totalPages > 1}
	<div
		class="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700"
	>
		<p class="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
		<div class="flex gap-2">
			{#if page > 1}
				<a href={listHref(basePath, filters, page - 1)} class="btn btn-secondary text-sm"
					>Previous</a
				>
			{/if}
			{#if page < totalPages}
				<a href={listHref(basePath, filters, page + 1)} class="btn btn-secondary text-sm">Next</a>
			{/if}
		</div>
	</div>
{/if}
