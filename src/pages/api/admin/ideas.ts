import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { sbFetch } from '../../../lib/supabase';

export const prerender = false;

/** Turn a title into a URL-safe slug. */
function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

/**
 * Create / update / delete an idea. Session is enforced here (in addition to
 * middleware) because API routes are a direct network surface. All work goes
 * through the service-role `sbFetch`, then we redirect back to the admin list.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!(await requireAdmin(cookies))) return redirect('/admin/login');

	const form = await request.formData();
	const action = String(form.get('_action') ?? '');

	try {
		if (action === 'delete') {
			const id = String(form.get('id') ?? '');
			if (!id) return redirect('/admin/ideas?error=1');
			await sbFetch('ideas', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}` });
			return redirect('/admin/ideas?ok=deleted');
		}

		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '');
		const published = form.get('published') === 'on' || form.get('published') === 'true';
		const sortOrder = Number(form.get('sort_order') ?? 0) || 0;

		if (!title) return redirect('/admin/ideas?error=title');

		if (action === 'update') {
			const id = String(form.get('id') ?? '');
			if (!id) return redirect('/admin/ideas?error=1');
			await sbFetch('ideas', {
				method: 'PATCH',
				query: `?id=eq.${encodeURIComponent(id)}`,
				body: {
					title,
					slug: slugify(title),
					body,
					published,
					sort_order: sortOrder,
					updated_at: new Date().toISOString(),
				},
			});
			return redirect('/admin/ideas?ok=updated');
		}

		// default: create
		await sbFetch('ideas', {
			method: 'POST',
			headers: { Prefer: 'return=minimal' },
			body: { title, slug: slugify(title), body, published, sort_order: sortOrder },
		});
		return redirect('/admin/ideas?ok=created');
	} catch (err) {
		console.error('admin ideas action failed:', err);
		return redirect('/admin/ideas?error=server');
	}
};
