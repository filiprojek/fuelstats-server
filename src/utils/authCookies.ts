import type { Response } from "express";
import AuthService from "../services/AuthService";

/** Truthy values accepted for a "remember me" flag in JSON bodies and query strings */
export const isRemember = (value: unknown) => value === true || value === "true" || value === "1" || value === 1;

/**
 * Set the session cookies. Remembered sessions persist for the token lifetime,
 * others are browser-session cookies that end when the browser closes.
 */
export function setAuthCookies(res: Response, token: string, remember: boolean) {
	const lifetime = remember ? { maxAge: AuthService.maxAge(true) * 1000 } : {};
	res.cookie("jwt", token, { httpOnly: true, ...lifetime });
	res.cookie("auth", true, { httpOnly: false, ...lifetime });
}

export function clearAuthCookies(res: Response) {
	res.cookie("jwt", "", { httpOnly: true, maxAge: 0 });
	res.cookie("auth", false, { httpOnly: false, maxAge: 0 });
}
