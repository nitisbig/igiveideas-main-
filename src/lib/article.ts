import { renderMarkdown, markdownToPlainText, escapeHtml } from './markdown';

/**
 * Article document model.
 *
 * An idea's `body` column (plain `text`) stores a JSON document describing an
 * ordered list of blocks. This keeps the storage portable (no schema change,
 * no new table) while letting the writer mix Markdown prose with positioned,
 * SEO-annotated images. Two things read this module: the SSR article page (for
 * indexable HTML + JSON-LD) and the browser editor (for live preview) — so the
 * parsing/rendering rules live in exactly one place.
 *
 * Backward compatibility: the three pre-existing ideas store raw prose, not
 * JSON. `parseArticle` detects that and wraps it in a single text block, so old
 * content renders unchanged and can be re-saved into the new format on first edit.
 */

export type Align = 'left' | 'center' | 'right';

export type TextBlock = { type: 'text'; markdown: string; align?: Align };
export type ImageBlock = {
	type: 'image';
	src: string;
	/** Alt text — required for SEO/accessibility; the editor nudges for it. */
	alt: string;
	/** Optional visible caption rendered in <figcaption>. */
	caption?: string;
	align: Align;
	/** Optional intrinsic dimensions, used to reserve space (CLS) when known. */
	width?: number;
	height?: number;
};

export type Block = TextBlock | ImageBlock;
export type ArticleDoc = { version: 1; blocks: Block[] };

const ALIGNS: Align[] = ['left', 'center', 'right'];

function coerceAlign(value: unknown): Align {
	return ALIGNS.includes(value as Align) ? (value as Align) : 'left';
}

/** Only allow web-safe image sources (http/https or root-relative paths). */
export function isSafeImageSrc(src: string): boolean {
	const t = (src ?? '').trim();
	return /^https?:\/\//i.test(t) || t.startsWith('/');
}

/**
 * Parse a stored `body` into a normalized block list.
 *
 * - Valid JSON in our shape → used directly (with each block sanitized).
 * - Anything else (legacy prose, empty) → a single Markdown text block.
 */
export function parseArticle(body: string | null | undefined): Block[] {
	const raw = (body ?? '').trim();
	if (!raw) return [{ type: 'text', markdown: '' }];

	if (raw.startsWith('{')) {
		try {
			const doc = JSON.parse(raw) as ArticleDoc;
			if (doc && doc.version === 1 && Array.isArray(doc.blocks)) {
				const blocks = doc.blocks.map(normalizeBlock).filter(Boolean) as Block[];
				return blocks.length ? blocks : [{ type: 'text', markdown: '' }];
			}
		} catch {
			// Not our JSON — fall through to legacy handling.
		}
	}

	// Legacy plain-text idea: preserve it verbatim as Markdown.
	return [{ type: 'text', markdown: raw }];
}

function normalizeBlock(block: unknown): Block | null {
	if (!block || typeof block !== 'object') return null;
	const b = block as Record<string, unknown>;

	if (b.type === 'image') {
		const src = String(b.src ?? '').trim();
		if (!isSafeImageSrc(src)) return null;
		const width = Number(b.width);
		const height = Number(b.height);
		return {
			type: 'image',
			src,
			alt: String(b.alt ?? '').trim(),
			caption: b.caption ? String(b.caption).trim() : undefined,
			align: coerceAlign(b.align),
			...(Number.isFinite(width) && width > 0 ? { width } : {}),
			...(Number.isFinite(height) && height > 0 ? { height } : {}),
		};
	}

	// Default to a text block.
	const align = b.align ? coerceAlign(b.align) : undefined;
	return { type: 'text', markdown: String(b.markdown ?? ''), ...(align && align !== 'left' ? { align } : {}) };
}

/** Serialize blocks back to the stored JSON string. */
export function serializeArticle(blocks: Block[]): string {
	const doc: ArticleDoc = { version: 1, blocks };
	return JSON.stringify(doc);
}

/**
 * Render an article to a safe HTML fragment.
 *
 * Text blocks go through the Markdown renderer; image blocks become a
 * `<figure>` with a lazy, async-decoded `<img>`, alignment class, and an
 * optional `<figcaption>`. All attributes are escaped.
 */
export function renderArticleHtml(blocks: Block[]): string {
	return blocks
		.map((block) => {
			if (block.type === 'image') {
				if (!isSafeImageSrc(block.src)) return '';
				const alt = escapeHtml(block.alt ?? '');
				const dims =
					block.width && block.height
						? ` width="${block.width}" height="${block.height}"`
						: '';
				const img = `<img src="${escapeHtml(block.src)}" alt="${alt}" loading="lazy" decoding="async"${dims}>`;
				const caption = block.caption
					? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
					: '';
				return `<figure class="fig fig--${block.align}">${img}${caption}</figure>`;
			}
			const html = renderMarkdown(block.markdown);
			if (block.align && block.align !== 'left') {
				return `<div class="align align--${block.align}">${html}</div>`;
			}
			return html;
		})
		.filter(Boolean)
		.join('\n');
}

/** Flatten an article to plain text (meta description, word count). */
export function articleToPlainText(blocks: Block[]): string {
	return blocks
		.map((b) => {
			if (b.type === 'image') return b.caption ?? '';
			return markdownToPlainText(b.markdown);
		})
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Ordered list of image sources — used for the JSON-LD `image` field. */
export function articleImages(blocks: Block[]): string[] {
	return blocks
		.filter((b): b is ImageBlock => b.type === 'image' && isSafeImageSrc(b.src))
		.map((b) => b.src);
}

/** Rough word count for SEO/reading signals. */
export function wordCount(text: string): number {
	const trimmed = text.trim();
	return trimmed ? trimmed.split(/\s+/).length : 0;
}
