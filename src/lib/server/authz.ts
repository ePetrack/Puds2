import { error, redirect } from '@sveltejs/kit';
import type { SessionUser } from './auth';

export const ROLES = ['admin', 'consultant', 'client'] as const;
export type Role = (typeof ROLES)[number];

/** Roles allowed to create/update/delete records. */
export const WRITE_ROLES: Role[] = ['admin', 'consultant'];

export function requireUser(user: SessionUser | null): SessionUser {
	if (!user) {
		redirect(303, '/login');
	}
	return user;
}

export function requireRole(user: SessionUser | null, allowed: Role[]): SessionUser {
	const u = requireUser(user);
	if (!allowed.includes(u.role as Role)) {
		error(403, 'You do not have permission to perform this action');
	}
	return u;
}
