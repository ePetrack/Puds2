import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { logger } from '$lib/server/logger';

const requestLogging: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;
	event.locals.log = logger.child({ requestId });

	const start = performance.now();
	const response = await resolve(event);
	response.headers.set('x-request-id', requestId);

	event.locals.log.info(
		{
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			durationMs: Math.round(performance.now() - start),
			userId: event.locals.user?.id
		},
		'request'
	);
	return response;
};

const authHandler: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

const sessionAndGuard: Handle = async ({ event, resolve }) => {
	const sessionData = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = sessionData?.user ?? null;
	event.locals.session = sessionData?.session ?? null;

	// Server-enforced protection for everything in the (app) group
	if (event.route.id?.startsWith('/(app)') && !event.locals.user) {
		redirect(303, '/login');
	}
	if (event.route.id === '/login' && event.locals.user) {
		redirect(303, '/');
	}

	return resolve(event);
};

export const handle = sequence(requestLogging, authHandler, sessionAndGuard);
