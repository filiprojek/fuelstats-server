/** Escape a string so it matches literally inside a RegExp */
export function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** RegExp matching exactly `s`, case-insensitively (for name/email lookups) */
export function exactCaseInsensitive(s: string): RegExp {
	return new RegExp(`^${escapeRegex(s)}$`, "i");
}
