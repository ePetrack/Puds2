import type { AuthSession, SessionUser } from '$lib/server/auth';
import type { Logger } from 'pino';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			session: AuthSession['session'] | null;
			log: Logger;
			requestId: string;
		}

		/**
		 * Shape returned by `handleError` and rendered by `+error.svelte`. `requestId` is the
		 * same id the server logged the failure under, so a user can quote it and it can be
		 * found — without it a production 500 is untraceable.
		 */
		interface Error {
			message: string;
			requestId?: string;
		}
	}
}

export {};
