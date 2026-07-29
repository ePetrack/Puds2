<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from './Modal.svelte';
	import { toast } from '$lib/stores/toast';

	/**
	 * The delete-confirmation cycle every list page repeats: a modal, a POST to `?/delete`,
	 * a toast, and `invalidateAll()` so the list reflects the change.
	 *
	 * It also does one thing the copies mostly didn't: when the server explains *why* a delete
	 * was refused — `fail(…, { deleteError })`, which every delete action already returns — that
	 * reason is shown instead of a generic failure. "Provider is referenced by utility accounts"
	 * is actionable; "Failed to delete provider" is not.
	 */
	interface Props {
		open: boolean;
		title: string;
		/** Capitalised singular used in the toasts, e.g. `Client` → "Client deleted". */
		entity: string;
		/** Row being deleted; the modal renders nothing useful without one. */
		id: string | undefined;
		/** Form action, for pages whose delete isn't the default `?/delete`. */
		action?: string;
		/** The confirmation copy — consequences differ per entity, so the caller writes it. */
		children: import('svelte').Snippet;
	}

	let { open = $bindable(), title, entity, id, action = '?/delete', children }: Props = $props();
</script>

<Modal bind:open {title}>
	{@render children()}

	{#snippet actions()}
		<button onclick={() => (open = false)} class="btn btn-secondary">Cancel</button>
		<form
			method="POST"
			{action}
			use:enhance={() => {
				return async ({ result }) => {
					open = false;
					if (result.type === 'success') {
						toast.success(`${entity} deleted`);
						await invalidateAll();
					} else if (result.type === 'failure' && result.data?.deleteError) {
						toast.error(String(result.data.deleteError));
					} else {
						toast.error(`Failed to delete ${entity.toLowerCase()}`);
					}
				};
			}}
		>
			<input type="hidden" name="id" value={id ?? ''} />
			<button type="submit" class="btn btn-danger">Delete</button>
		</form>
	{/snippet}
</Modal>
