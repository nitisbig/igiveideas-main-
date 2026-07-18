// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Platform-agnostic adapter selection.
 *
 * The app code (endpoints, secrets via `astro:env/server`) is portable across
 * adapters — only the *build target* changes per host. Pick it here so the same
 * source deploys anywhere by setting one env var at build time:
 *
 *   DEPLOY_TARGET=node        -> Render, AWS, Docker, any self-host, local
 *   DEPLOY_TARGET=vercel      -> Vercel
 *   DEPLOY_TARGET=cloudflare  -> Cloudflare Workers/Pages
 *
 * If DEPLOY_TARGET is unset, we auto-detect from platform-provided env vars,
 * falling back to `node` (the most universal / self-hostable option).
 */
function detectTarget() {
	if (process.env.DEPLOY_TARGET) return process.env.DEPLOY_TARGET.toLowerCase();
	if (process.env.VERCEL) return 'vercel';
	if (process.env.CF_PAGES || process.env.CLOUDFLARE_ACCOUNT_ID) return 'cloudflare';
	return 'node';
}

async function resolveAdapter() {
	const target = detectTarget();
	switch (target) {
		case 'vercel': {
			const { default: vercel } = await import('@astrojs/vercel');
			return vercel();
		}
		case 'cloudflare': {
			const { default: cloudflare } = await import('@astrojs/cloudflare');
			return cloudflare();
		}
		case 'node': {
			const { default: node } = await import('@astrojs/node');
			return node({ mode: 'standalone' });
		}
		default:
			throw new Error(
				`Unknown DEPLOY_TARGET "${target}". Use one of: node, vercel, cloudflare.`,
			);
	}
}

// https://astro.build/config
export default defineConfig({
	adapter: await resolveAdapter(),
});
