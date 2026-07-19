import { defineMiddleware } from 'astro:middleware';
import { requireAdmin } from './lib/auth';

/**
 * Guard the admin area. Everything under `/admin` requires a valid session
 * except the login page itself. Unauthenticated requests are redirected to
 * `/admin/login`. The `/api/admin/*` endpoints verify the session themselves
 * (they need to return JSON/redirects rather than bounce to a page).
 */
export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
	const { pathname } = url;

	const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
	const isLogin = pathname === '/admin/login';

	if (isAdminPage && !isLogin) {
		const user = await requireAdmin(cookies);
		if (!user) return redirect('/admin/login');
	}

	return next();
});
