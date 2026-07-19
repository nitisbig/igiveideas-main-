/**
 * Curated theme + font presets applied site-wide via CSS custom properties.
 *
 * The admin panel stores only a preset *key* (e.g. `dark`, `mono`); the actual
 * values live here so the "classic raw" design stays consistent and can't be
 * broken by free-form input. `Layout.astro` calls `resolveTheme` and injects
 * the result into `:root`.
 */

export type ThemeKey = 'paper' | 'dark' | 'sepia';
export type FontKey = 'garamond' | 'caveat' | 'mono';

type ThemeVars = {
	paper: string;
	ink: string;
	inkSoft: string;
	accent: string;
	line: string;
};

type FontDef = {
	/** `font-family` applied to <body>. */
	family: string;
	/** Google Fonts stylesheet href, or null when a system stack is used. */
	href: string | null;
};

export const THEMES: Record<ThemeKey, ThemeVars> = {
	paper: { paper: '#fbfbe8', ink: '#2a2622', inkSoft: '#4d4740', accent: '#8a5a2b', line: '#2a2622' },
	dark: { paper: '#1c1a17', ink: '#ece7dc', inkSoft: '#b3ab9c', accent: '#d9a05b', line: '#ece7dc' },
	sepia: { paper: '#f2e8d5', ink: '#3b2f22', inkSoft: '#6b5942', accent: '#9c5f2b', line: '#3b2f22' },
};

const GARAMOND =
	'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap';

export const FONTS: Record<FontKey, FontDef> = {
	garamond: { family: "'EB Garamond', Georgia, 'Times New Roman', serif", href: GARAMOND },
	caveat: { family: "'Caveat', 'Segoe Print', cursive", href: GARAMOND },
	mono: { family: "'Courier New', ui-monospace, 'SF Mono', monospace", href: null },
};

export const DEFAULT_THEME: ThemeKey = 'paper';
export const DEFAULT_FONT: FontKey = 'garamond';

function isThemeKey(v: string): v is ThemeKey {
	return v in THEMES;
}
function isFontKey(v: string): v is FontKey {
	return v in FONTS;
}

export function resolveTheme(theme?: string | null, font?: string | null) {
	const themeKey: ThemeKey = theme && isThemeKey(theme) ? theme : DEFAULT_THEME;
	const fontKey: FontKey = font && isFontKey(font) ? font : DEFAULT_FONT;
	const vars = THEMES[themeKey];
	const fontDef = FONTS[fontKey];

	// Note: 'Caveat' ships in the Garamond stylesheet, so the caveat font also
	// needs that href even though its family differs.
	const fontHref = fontDef.href;

	const css = `--paper:${vars.paper};--ink:${vars.ink};--ink-soft:${vars.inkSoft};--accent:${vars.accent};--line:${vars.line};--font-body:${fontDef.family};`;

	return { themeKey, fontKey, css, fontFamily: fontDef.family, fontHref };
}
