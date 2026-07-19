import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { Resend } from 'resend';

// Rendered on demand so it can run server-side code and read secrets.
export const prerender = false;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

// Basic shape check — the browser already validates, this guards the endpoint.
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST: APIRoute = async ({ request }) => {
	let payload: { idea?: unknown; email?: unknown };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, 400);
	}

	const idea = typeof payload.idea === 'string' ? payload.idea.trim() : '';
	const email = typeof payload.email === 'string' ? payload.email.trim() : '';

	if (!idea) return json({ error: 'Idea is required.' }, 400);
	if (!isEmail(email)) return json({ error: 'A valid email is required.' }, 400);

	// Read at request time via the adapter so it works on Cloudflare Workers
	// (dashboard secrets) as well as Node/local dev (.env). Reading these from
	// `import.meta.env` does NOT work on Cloudflare.
	const RESEND_API_KEY = getSecret('RESEND_API_KEY');
	const RESEND_FROM_EMAIL = getSecret('RESEND_FROM_EMAIL');
	const SUPABASE_URL = getSecret('SUPABASE_URL');
	const SUPABASE_ANON_KEY = getSecret('SUPABASE_ANON_KEY');

	if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
		console.error('Resend is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL.');
		return json({ error: 'Email service is not configured.' }, 500);
	}

	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
		console.error('Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY.');
		return json({ error: 'Storage is not configured.' }, 500);
	}

	// Persist the submission first via the Supabase REST API. Using `fetch`
	// (no SDK) keeps this portable across Node, Vercel, and Cloudflare Workers.
	const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/idea_submissions`, {
		method: 'POST',
		headers: {
			apikey: SUPABASE_ANON_KEY,
			Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
			'Content-Type': 'application/json',
			Prefer: 'return=minimal',
		},
		body: JSON.stringify({ idea, email }),
	});

	if (!dbResponse.ok) {
		console.error('Supabase insert failed:', dbResponse.status, await dbResponse.text());
		return json({ error: 'Could not save your idea. Please try again.' }, 502);
	}

	const resend = new Resend(RESEND_API_KEY);

	const { error } = await resend.emails.send({
		from: RESEND_FROM_EMAIL,
		to: email,
		subject: 'welcome',
		text: `Oh wow! I am working on ${idea}`,
	});

	if (error) {
		console.error('Resend send failed:', error);
		return json({ error: 'Could not send the email. Please try again.' }, 502);
	}

	return json({ ok: true });
};
