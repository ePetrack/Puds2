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
	}
}

export {};
