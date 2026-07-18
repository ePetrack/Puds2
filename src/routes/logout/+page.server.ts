import { redirect } from '@sveltejs/kit';
import { auth, applySetCookies } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// Direct GET navigation to /logout just bounces home; sign-out requires a POST
export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const response = await auth.api.signOut({
			headers: request.headers,
			asResponse: true
		});
		applySetCookies(cookies, response);
		redirect(303, '/login');
	}
};
