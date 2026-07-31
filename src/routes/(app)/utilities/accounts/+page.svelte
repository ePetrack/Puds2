<script lang="ts">
	import ConfirmDelete from '$lib/components/ui/ConfirmDelete.svelte';
	import UtilityNav from '$lib/components/utilities/UtilityNav.svelte';
	import { UTILITY_TYPES, ACCOUNT_STATUSES, formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let accountToDelete = $state<{ id: string; accountNumber: string } | null>(null);

	function confirmDelete(account: { id: string; accountNumber: string }) {
		accountToDelete = account;
		deleteModalOpen = true;
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
	};
</script>

<svelte:head>
	<title>Utility Accounts - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Utility Accounts</h1>
			<p class="text-gray-600 dark:text-gray-400">Billing accounts with utility providers</p>
		</div>
		<a href="/utilities/accounts/new" class="btn btn-primary">+ Add Account</a>
	</div>

	<UtilityNav />

	<form method="GET" class="card flex flex-wrap items-end gap-4 p-4">
		<div class="w-56">
			<label class="label" for="client">Client</label>
			<select id="client" name="client" class="input">
				<option value="">All clients</option>
				{#each data.clientOptions as c (c.id)}
					<option value={c.id} selected={data.filters.client === c.id}>{c.name}</option>
				{/each}
			</select>
		</div>
		<div class="w-48">
			<label class="label" for="type">Utility Type</label>
			<select id="type" name="type" class="input">
				<option value="">All types</option>
				{#each UTILITY_TYPES as type (type)}
					<option value={type} selected={data.filters.type === type}>{formatEnumLabel(type)}</option
					>
				{/each}
			</select>
		</div>
		<div class="w-40">
			<label class="label" for="status">Status</label>
			<select id="status" name="status" class="input">
				<option value="">All statuses</option>
				{#each ACCOUNT_STATUSES as status (status)}
					<option value={status} selected={data.filters.status === status}>
						{formatEnumLabel(status)}
					</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{data.accounts.length} account{data.accounts.length === 1 ? '' : 's'}
		</p>
	</form>

	<div class="card overflow-hidden">
		{#if data.accounts.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl">🧾</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No accounts found</h3>
				<a href="/utilities/accounts/new" class="btn btn-primary mt-2 inline-block">+ Add Account</a
				>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Account #</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Client</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Provider</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Type</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Rate Schedule</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Status</th
							>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each data.accounts as account (account.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
								<td class="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
									{account.accountNumber}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{account.clientName ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{account.providerName ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{formatEnumLabel(account.utilityType)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{account.rateScheduleName ?? '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
											account.status
										]}"
									>
										{formatEnumLabel(account.status)}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<div class="flex justify-end gap-2">
										<a
											href="/utilities/bills?account={account.id}"
											class="text-primary-600 hover:text-primary-900 dark:text-primary-400">Bills</a
										>
										<a
											href="/utilities/accounts/{account.id}/edit"
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400">Edit</a
										>
										<button
											onclick={() => confirmDelete(account)}
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

<ConfirmDelete
	bind:open={deleteModalOpen}
	title="Delete Account"
	entity="Account"
	id={accountToDelete?.id}
>
	<p class="text-gray-700 dark:text-gray-300">
		Are you sure you want to delete account <strong>{accountToDelete?.accountNumber}</strong>? All
		bills recorded against this account will also be deleted.
	</p>
</ConfirmDelete>
