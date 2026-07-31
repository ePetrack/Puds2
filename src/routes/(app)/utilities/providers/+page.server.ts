import { listProviders, deleteProvider } from '$lib/server/services/providers';
import { deleteAction } from '$lib/server/actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { providers: await listProviders() };
};

export const actions: Actions = {
	delete: deleteAction({
		entity: 'Provider',
		logKey: 'providerId',
		logMessage: 'utility provider deleted',
		conflictMessage: 'Provider is referenced by utility accounts and cannot be deleted',
		remove: deleteProvider
	})
};
