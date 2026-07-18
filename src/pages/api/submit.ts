import type { APIRoute } from 'astro';
import { Resend } from 'resend';

// Rendered on demand so it can run server-side code and read secrets.
export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = import.meta.env.RESEND_FROM_EMAIL;

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

	if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
		console.error('Resend is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL.');
		return json({ error: 'Email service is not configured.' }, 500);
	}

	const resend = new Resend(RESEND_API_KEY);

	const { error } = await resend.emails.send({
		from: RESEND_FROM_EMAIL,
		to: email,
		subject: 'welcome',
		text: `welcome

Thanks for sharing your idea with igiveideas:

"${idea}"

— igiveideas`,
	});

	if (error) {
		console.error('Resend send failed:', error);
		return json({ error: 'Could not send the email. Please try again.' }, 502);
	}

	return json({ ok: true });
};
