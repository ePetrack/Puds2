import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Guard lives in hooks.server.ts; user is guaranteed here
	return {
		user: {
			id: locals.user!.id,
			name: locals.user!.name,
			email: locals.user!.email,
			role: locals.user!.role as string
		}
	};
};
