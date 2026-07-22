import { fail, redirect } from '@sveltejs/kit';
import { auth, applySetCookies } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email });
		}

		// asResponse returns errors as a Response rather than throwing
		const response = await auth.api.signInEmail({
			body: { email, password },
			asResponse: true
		});

		if (!response.ok) {
			locals.log.warn({ email, status: response.status }, 'failed login attempt');
			return fail(401, { error: 'Invalid email or password', email });
		}

		applySetCookies(cookies, response);
		redirect(303, '/');
	}
};
