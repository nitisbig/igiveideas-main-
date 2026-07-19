import type { APIRoute } from 'astro';
import { hashPassword, readSettings, requireAdmin } from '../../../lib/auth';
import { sbFetch } from '../../../lib/supabase';
import { FONTS, THEMES } from '../../../lib/theme';

export const prerender = false;

/**
 * Update theme/font presets and/or admin credentials. Two independent forms
 * post here, distinguished by `_section` (`appearance` or `account`).
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!(await requireAdmin(cookies))) return redirect('/admin/login');

	const form = await request.formData();
	const section = String(form.get('_section') ?? '');

	try {
		if (section === 'appearance') {
			const theme = String(form.get('theme') ?? '');
			const font = String(form.get('font') ?? '');
			if (!(theme in THEMES) || !(font in FONTS)) {
				return redirect('/admin/settings?error=invalid');
			}
			await sbFetch('admin_settings', {
				method: 'PATCH',
				query: '?id=eq.1',
				body: { theme, font, updated_at: new Date().toISOString() },
			});
			return redirect('/admin/settings?ok=appearance');
		}

		if (section === 'account') {
			const settings = await readSettings();
			if (!settings) return redirect('/admin/settings?error=config');

			const username = String(form.get('username') ?? '').trim();
			const password = String(form.get('password') ?? '');

			if (!username) return redirect('/admin/settings?error=username');

			const patch: Record<string, unknown> = {
				username,
				updated_at: new Date().toISOString(),
			};

			// Only rotate the password when a new one was supplied.
			if (password) {
				const { hash, salt } = await hashPassword(password);
				patch.password_hash = hash;
				patch.password_salt = salt;
			}

			await sbFetch('admin_settings', {
				method: 'PATCH',
				query: '?id=eq.1',
				body: patch,
			});
			return redirect('/admin/settings?ok=account');
		}

		return redirect('/admin/settings?error=1');
	} catch (err) {
		console.error('admin settings action failed:', err);
		return redirect('/admin/settings?error=server');
	}
};
