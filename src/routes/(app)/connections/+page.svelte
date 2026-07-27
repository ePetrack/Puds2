<script lang="ts">
	import { UTILITY_TYPES, formatEnumLabel } from '$lib/schemas/utility';

	let { data } = $props();

	let premises = $derived(data.premises);
	let gaps = $derived(data.gaps);
	let counts = $derived(data.counts);
	let gapCount = $derived(
		gaps.unattributed.length + gaps.accountsWithoutMeters.length + gaps.premiseMismatches.length
	);

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		retired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
	};
</script>

<svelte:head>
	<title>Connections - Energy Management Platform</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Connections</h1>
		<p class="text-gray-600 dark:text-gray-400">
			How buildings, meters and utility accounts actually wire together — one premise at a time.
		</p>
	</div>

	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
	>
		<p>
			<strong>Ownership shown here is derived, not recorded.</strong> A meter billed under a utility
			account is treated as the <em>utility's</em> revenue meter; a meter with no account is treated
			as <em>internally owned</em>. Meters have no ownership field yet — until they do, correct this
			by attaching or clearing the account on the meter.
		</p>
	</div>

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
		<div class="w-48">
			<label class="label" for="ownership">Ownership</label>
			<select id="ownership" name="ownership" class="input">
				<option value="">Both</option>
				<option value="utility" selected={data.filters.ownership === 'utility'}>
					Utility-owned
				</option>
				<option value="internal" selected={data.filters.ownership === 'internal'}>
					Internally-owned
				</option>
			</select>
		</div>
		<button type="submit" class="btn btn-secondary">Filter</button>
		<p class="pb-2 text-sm text-gray-500 dark:text-gray-400">
			{counts.meters} meter{counts.meters === 1 ? '' : 's'} · {counts.utility} utility-owned · {counts.internal}
			internal · {counts.accounts} account{counts.accounts === 1 ? '' : 's'}
		</p>
	</form>

	<!-- Gaps first: an unattributed meter or an account with nothing behind it is the
	     reason to open this page at all. -->
	<div class="card p-6">
		<h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
			Gaps
			<span
				class="ml-2 inline-flex rounded-full px-2 py-0.5 text-xs {gapCount === 0
					? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
					: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
			>
				{gapCount}
			</span>
		</h2>
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			Relationships that are missing or inconsistent. Each one distorts cost attribution.
		</p>

		{#if gapCount === 0}
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Every meter is attributed and every account has at least one meter.
			</p>
		{:else}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div>
					<h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
						Unattributed meters ({gaps.unattributed.length})
					</h3>
					<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
						No utility account and no parent meter — nothing bills to them and nothing feeds them.
					</p>
					{#if gaps.unattributed.length === 0}
						<p class="text-sm text-gray-400 dark:text-gray-500">None</p>
					{:else}
						<ul class="space-y-1 text-sm">
							{#each gaps.unattributed as m (m.id)}
								<li>
									<a
										href="/utilities/meters/{m.id}/edit"
										class="text-blue-600 hover:underline dark:text-blue-400">{m.meterNumber}</a
									>
									<span class="text-gray-500 dark:text-gray-400"
										>— {m.premiseName ?? 'no premise'}</span
									>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div>
					<h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
						Accounts with no meters ({gaps.accountsWithoutMeters.length})
					</h3>
					<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
						Bills arrive with no metered premise to attribute them to.
					</p>
					{#if gaps.accountsWithoutMeters.length === 0}
						<p class="text-sm text-gray-400 dark:text-gray-500">None</p>
					{:else}
						<ul class="space-y-1 text-sm">
							{#each gaps.accountsWithoutMeters as a (a.id)}
								<li>
									<a
										href="/utilities/accounts/{a.id}"
										class="text-blue-600 hover:underline dark:text-blue-400">{a.accountNumber}</a
									>
									<span class="text-gray-500 dark:text-gray-400">
										— {a.providerName ?? 'no provider'}{a.clientName ? ` · ${a.clientName}` : ''}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div>
					<h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
						Premise mismatches ({gaps.premiseMismatches.length})
					</h3>
					<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
						A submeter sitting outside its parent's premise — submetered allocation will be wrong.
					</p>
					{#if gaps.premiseMismatches.length === 0}
						<p class="text-sm text-gray-400 dark:text-gray-500">None</p>
					{:else}
						<ul class="space-y-1 text-sm">
							{#each gaps.premiseMismatches as m (m.id)}
								<li>
									<a
										href="/utilities/meters/{m.id}/edit"
										class="text-blue-600 hover:underline dark:text-blue-400">{m.meterNumber}</a
									>
									<span class="text-gray-500 dark:text-gray-400">
										on {m.premiseName ?? '—'}, but parent {m.parentMeterNumber} is on
										{m.parentPremiseName ?? '—'}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if premises.length === 0}
		<div class="card py-12 text-center">
			<div class="mb-4 text-6xl">🔌</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No connections found</h3>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Adjust the filters, or add meters from Facility Management.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each premises as premise (premise.key)}
				<div class="card p-6">
					<div class="mb-4 flex flex-wrap items-center gap-2">
						<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
							{#if premise.href}
								<a href={premise.href} class="hover:underline">{premise.name}</a>
							{:else}
								{premise.name}
							{/if}
						</h2>
						{#if premise.kind === 'complex'}
							<span
								class="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200"
							>
								Complex
							</span>
						{/if}
						{#if premise.clientName}
							<span class="text-sm text-gray-500 dark:text-gray-400">· {premise.clientName}</span>
						{/if}
					</div>

					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						{#each [{ title: 'Utility-owned meters', hint: 'Revenue meters — billed under a utility account', meters: premise.utilityMeters, utility: true }, { title: 'Internally-owned meters', hint: 'Client-owned meters and submeters — no account of their own', meters: premise.internalMeters, utility: false }] as col (col.title)}
							<div>
								<h3 class="text-sm font-semibold text-gray-900 dark:text-white">{col.title}</h3>
								<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">{col.hint}</p>
								{#if col.meters.length === 0}
									<p class="text-sm text-gray-400 dark:text-gray-500">None</p>
								{:else}
									<ul class="divide-y divide-gray-200 dark:divide-gray-700">
										{#each col.meters as meter (meter.id)}
											<li class="py-2">
												<div class="flex flex-wrap items-center gap-2">
													<a
														href="/utilities/meters/{meter.id}/edit"
														class="font-medium text-blue-600 hover:underline dark:text-blue-400"
													>
														{meter.meterNumber}
													</a>
													<span
														class="inline-flex rounded-full px-2 py-0.5 text-xs {statusColors[
															meter.status
														]}"
													>
														{formatEnumLabel(meter.status)}
													</span>
													<span class="text-xs text-gray-500 dark:text-gray-400">
														{formatEnumLabel(meter.utilityType)} · {formatEnumLabel(meter.unit)}
													</span>
												</div>
												<p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
													{#if col.utility}
														Account
														<a
															href="/utilities/accounts/{meter.accountId}"
															class="text-blue-600 hover:underline dark:text-blue-400"
														>
															{meter.accountNumber}
														</a>
														{#if meter.providerName}· {meter.providerName}{/if}
													{:else if meter.parentMeterNumber}
														Submeter of {meter.parentMeterNumber}
													{:else}
														<span class="text-red-600 dark:text-red-400"
															>No account and no parent meter</span
														>
													{/if}
													{#if meter.submeterCount > 0}
														· feeds {meter.submeterCount} submeter{meter.submeterCount === 1
															? ''
															: 's'}
													{/if}
												</p>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
