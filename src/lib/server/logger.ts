import pino from 'pino';
import { dev } from '$app/environment';

export const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	...(dev
		? {
				transport: {
					target: 'pino-pretty',
					options: { colorize: true, translateTime: 'HH:MM:ss' }
				}
			}
		: {})
});
