import { getSecret } from 'astro:env/server';
import type { AstroCookies } from 'astro';
import { sbFetch } from './supabase';

/**
 * Auth + admin settings helpers.
 *
 * All crypto uses Web Crypto (`crypto.subtle`) so it runs unchanged on Node,
 * Vercel, and Cloudflare Workers. Passwords are hashed with PBKDF2-SHA256;
 * the session cookie is an HMAC-signed `username.issuedAt.signature` token.
 */

const PBKDF2_ITERATIONS = 100_000;
const SESSION_COOKIE = 'ig_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** Constant-time-ish string compare to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256)
// ---------------------------------------------------------------------------

export async function hashPassword(
	password: string,
	saltB64?: string,
): Promise<{ hash: string; salt: string }> {
	const salt = saltB64 ? fromBase64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits',
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		key,
		256,
	);
	return { hash: toBase64(new Uint8Array(bits)), salt: toBase64(salt) };
}

export async function verifyPassword(
	password: string,
	expectedHash: string,
	saltB64: string,
): Promise<boolean> {
	const { hash } = await hashPassword(password, saltB64);
	return safeEqual(hash, expectedHash);
}

// ---------------------------------------------------------------------------
// Session cookie (HMAC-signed)
// ---------------------------------------------------------------------------

async function hmacKey(): Promise<CryptoKey> {
	const secret = getSecret('SESSION_SECRET');
	if (!secret) throw new Error('SESSION_SECRET is not configured.');
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	);
}

async function sign(message: string): Promise<string> {
	const key = await hmacKey();
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return toBase64(new Uint8Array(sig));
}

export async function createSession(username: string): Promise<string> {
	const payload = `${encodeURIComponent(username)}.${Date.now()}`;
	const signature = await sign(payload);
	return `${payload}.${signature}`;
}

export async function verifySession(token: string | undefined): Promise<string | null> {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [user, issuedAt, signature] = parts;
	const payload = `${user}.${issuedAt}`;
	const expected = await sign(payload);
	if (!safeEqual(signature, expected)) return null;
	const ts = Number(issuedAt);
	if (!Number.isFinite(ts) || Date.now() - ts > SESSION_TTL_MS) return null;
	return decodeURIComponent(user);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function setSessionCookie(cookies: AstroCookies, token: string): void {
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_TTL_MS / 1000,
	});
}

export function clearSessionCookie(cookies: AstroCookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Returns the logged-in username, or null. Used by middleware and pages. */
export async function requireAdmin(cookies: AstroCookies): Promise<string | null> {
	return verifySession(cookies.get(SESSION_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Admin settings row
// ---------------------------------------------------------------------------

export type AdminSettings = {
	id: number;
	username: string;
	password_hash: string;
	password_salt: string;
	theme: string;
	font: string;
};

/** Read the single admin_settings row (id = 1). Returns null on any failure. */
export async function readSettings(): Promise<AdminSettings | null> {
	try {
		const rows = await sbFetch<AdminSettings[]>('admin_settings', {
			query: '?id=eq.1&select=*&limit=1',
		});
		return rows?.[0] ?? null;
	} catch (err) {
		console.error('readSettings failed:', err);
		return null;
	}
}
