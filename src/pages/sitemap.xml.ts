import type { APIRoute } from 'astro';
import { sbFetch } from '../lib/supabase';

export const prerender = false;

const SITE = 'https://igiveideas.com';

// Static, publicly indexable routes and their relative priority.
const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/ideas', priority: '0.8', changefreq: 'weekly' },
	{ path: '/projects', priority: '0.7', changefreq: 'monthly' },
	{ path: '/about', priority: '0.6', changefreq: 'monthly' },
];

type IdeaRow = { slug: string; updated_at: string | null };

/**
 * Dynamic sitemap. The site is fully SSR (every route is `prerender = false`),
 * so the build-time `@astrojs/sitemap` integration can't enumerate the
 * `/ideas/[slug]` routes — it only sees static files. We generate the sitemap
 * at request time from the published ideas in Supabase instead.
 */
export const GET: APIRoute = async () => {
	let ideas: IdeaRow[] = [];
	try {
		ideas = await sbFetch<IdeaRow[]>('ideas', {
			query: '?select=slug,updated_at&published=eq.true&order=sort_order.asc',
		});
	} catch (err) {
		console.error('sitemap: load ideas failed:', err);
	}

	const urls = [
		...STATIC_ROUTES.map(
			(r) =>
				`<url><loc>${SITE}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
		),
		...ideas.map((idea) => {
			const lastmod = idea.updated_at
				? `<lastmod>${new Date(idea.updated_at).toISOString()}</lastmod>`
				: '';
			return `<url><loc>${SITE}/ideas/${encodeURIComponent(idea.slug)}</loc>${lastmod}<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
		}),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
