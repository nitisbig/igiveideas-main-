import type { APIRoute } from 'astro';
import {
	createSession,
	readSettings,
	setSessionCookie,
	verifyPassword,
} from '../../../lib/auth';

export const prerender = false;

/**
 * Verify credentials against admin_settings and set a signed session cookie.
 * Uses a classic form POST (application/x-www-form-urlencoded) and redirects,
 * so the login page needs no client JS.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const username = String(form.get('username') ?? '').trim();
	const password = String(form.get('password') ?? '');

	const fail = () => redirect('/admin/login?error=1');

	if (!username || !password) return fail();

	const settings = await readSettings();
	if (!settings) return redirect('/admin/login?error=config');

	if (username !== settings.username) return fail();

	const ok = await verifyPassword(password, settings.password_hash, settings.password_salt);
	if (!ok) return fail();

	setSessionCookie(cookies, await createSession(username));
	return redirect('/admin');
};
