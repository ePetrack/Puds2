<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let providerToDelete = $state<{ id: string; name: string } | null>(null);

	function confirmDelete(provider: { id: string; name: string }) {
		providerToDelete = provider;
		deleteModalOpen = true;
	}
</script>

<svelte:head>
	<title>Utility Providers - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Utility Providers</h1>
			<p class="text-gray-600 dark:text-gray-400">Utility companies serving your clients</p>
		</div>
		<a href="/utilities/providers/new" class="btn btn-primary">+ Add Provider</a>
	</div>

	<UtilityNav />

	<div class="card overflow-hidden">
		{#if data.providers.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🏭</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No providers yet</h3>
				<p class="mb-4 text-gray-600 dark:text-gray-400">
					Add the utility companies that serve your clients
				</p>
				<a href="/utilities/providers/new" class="btn btn-primary">+ Add Provider</a>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Name</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Utilities</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Contact</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Phone</th
							>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.providers as provider (provider.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4">
									<span class="font-medium text-gray-900 dark:text-white">{provider.name}</span>
									{#if provider.website}
										<a
											href={provider.website}
											target="_blank"
											rel="noopener noreferrer"
											class="ml-2 text-xs text-primary-600 hover:underline dark:text-primary-400"
										>
											Website ↗
										</a>
									{/if}
								</td>
								<td class="px-6 py-4">
									<div class="flex flex-wrap gap-1">
										{#each provider.utilityTypes ?? [] as type (type)}
											<span
												class="inline-flex rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800 dark:bg-primary-900 dark:text-primary-200"
											>
												{formatEnumLabel(type)}
											</span>
										{/each}
									</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{provider.accountManager || '-'}
									{#if provider.email}
										<span class="block text-xs text-gray-500 dark:text-gray-400">
											{provider.email}
										</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{provider.phone || '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/utilities/providers/{provider.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(provider)}
											class="text-red-600 hover:text-red-900 dark:text-red-400"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<Modal bind:open={deleteModalOpen} title="Delete Provider">
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete <strong>{providerToDelete?.name}</strong>? Rate schedules for
		this provider will also be deleted. Deletion is blocked while utility accounts still reference
		it.
	</p>

	{#snippet actions()}
		<button onclick={() => (deleteModalOpen = false)} class="btn btn-secondary">Cancel</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return async ({ result }) => {
					deleteModalOpen = false;
					if (result.type === 'success') {
						toast.success('Provider deleted');
						await invalidateAll();
					} else if (result.type === 'failure' && result.data?.deleteError) {
						toast.error(String(result.data.deleteError));
					} else {
						toast.error('Failed to delete provider');
					}
				};
			}}
		>
			<input type="hidden" name="id" value={providerToDelete?.id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
