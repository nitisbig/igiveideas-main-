import { getSecret } from 'astro:env/server';

/**
 * Minimal Supabase REST client used by server-side admin code.
 *
 * We deliberately avoid the Supabase SDK to stay portable across Node, Vercel,
 * and Cloudflare Workers (see `src/pages/api/submit.ts`). Admin routes run
 * behind auth, so they use the service-role key to bypass RLS. This key is
 * server-only and must never reach the browser.
 */

export class SupabaseConfigError extends Error {}

function config() {
	const url = getSecret('SUPABASE_URL');
	const key = getSecret('SUPABASE_SERVICE_ROLE_KEY');
	if (!url || !key) {
		throw new SupabaseConfigError(
			'Supabase admin is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
		);
	}
	return { url, key };
}

type SbOptions = {
	method?: string;
	body?: unknown;
	/** Extra query string appended to the path, e.g. `?select=*&order=sort_order`. */
	query?: string;
	/** Extra headers, e.g. `Prefer: return=representation`. */
	headers?: Record<string, string>;
};

/**
 * Perform a request against the Supabase REST API (`/rest/v1/<table>`).
 * Returns the parsed JSON body (or `null` for empty responses).
 * Throws on non-2xx so callers can surface a 500/502.
 */
export async function sbFetch<T = unknown>(table: string, options: SbOptions = {}): Promise<T> {
	const { url, key } = config();
	const { method = 'GET', body, query = '', headers = {} } = options;

	const res = await fetch(`${url}/rest/v1/${table}${query}`, {
		method,
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json',
			...headers,
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${text}`);
	}

	const text = await res.text();
	return (text ? JSON.parse(text) : null) as T;
}
