import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { user, session, account, verification } from './db/schema';
import type { Cookies } from '@sveltejs/kit';

function createAuth() {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error('AUTH_SECRET is not set. Copy .env.example to .env and configure it.');
	}

	return betterAuth({
		secret,
		baseURL: process.env.ORIGIN ?? 'http://localhost:5173',
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: { user, session, account, verification }
		}),
		emailAndPassword: {
			enabled: true,
			// Users are provisioned by admins (or the seed script); no public self-registration
			disableSignUp: process.env.ALLOW_SIGNUP !== 'true'
		},
		user: {
			additionalFields: {
				role: {
					type: 'string',
					defaultValue: 'client',
					input: false
				}
			}
		}
	});
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

// Lazy init so SvelteKit's build-time analysis can import this module without env vars
export const auth: Auth = new Proxy({} as Auth, {
	get(_target, prop) {
		if (!instance) instance = createAuth();
		const real = instance as unknown as Record<PropertyKey, unknown>;
		const value = real[prop];
		return typeof value === 'function'
			? (value as (...args: unknown[]) => unknown).bind(real)
			: value;
	}
});

export type AuthSession = typeof auth.$Infer.Session;
export type SessionUser = AuthSession['user'];

/**
 * Copy Set-Cookie headers from a better-auth Response onto SvelteKit's cookies API,
 * so server actions can complete sign-in/sign-out flows.
 */
export function applySetCookies(cookies: Cookies, response: Response): void {
	for (const raw of response.headers.getSetCookie()) {
		const [pair, ...attrParts] = raw.split(';');
		const eq = pair.indexOf('=');
		const name = pair.slice(0, eq).trim();
		const value = decodeURIComponent(pair.slice(eq + 1).trim());

		const attrs: Record<string, string> = {};
		for (const part of attrParts) {
			const [k, v] = part.split('=');
			attrs[k.trim().toLowerCase()] = v?.trim() ?? '';
		}

		cookies.set(name, value, {
			path: attrs['path'] ?? '/',
			httpOnly: 'httponly' in attrs,
			secure: 'secure' in attrs,
			sameSite: (attrs['samesite']?.toLowerCase() as 'lax' | 'strict' | 'none') ?? 'lax',
			...(attrs['max-age'] ? { maxAge: Number(attrs['max-age']) } : {}),
			...(attrs['expires'] ? { expires: new Date(attrs['expires']) } : {})
		});
	}
}
