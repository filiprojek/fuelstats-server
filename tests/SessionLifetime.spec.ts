import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthService from "../src/services/AuthService";
import User from "../src/models/User";
import env from "../src/config/environment";
import { parseRememberDays } from "../src/config/environment";

const DAY = 24 * 60 * 60;
const decode = (token: string): any => jwt.verify(token, env.JWT_SECRET);

describe("session lifetime (remember me)", () => {
	const originalDays = env.AUTH_REMEMBER_DAYS;

	afterEach(() => {
		jest.restoreAllMocks();
		(env as any).AUTH_REMEMBER_DAYS = originalDays;
	});

	describe("parseRememberDays", () => {
		it("defaults to 30 days", () => {
			expect(parseRememberDays(undefined)).toBe(30);
			expect(parseRememberDays("")).toBe(30);
			expect(parseRememberDays("abc")).toBe(30);
		});

		it("accepts a positive number of days", () => {
			expect(parseRememberDays("14")).toBe(14);
			expect(parseRememberDays("90")).toBe(90);
		});

		it("rejects zero and negative values", () => {
			expect(parseRememberDays("0")).toBe(30);
			expect(parseRememberDays("-5")).toBe(30);
		});
	});

	describe("signToken", () => {
		it("issues a one-day session token by default", () => {
			const decoded = decode(AuthService.signToken({ id: "u1", email: "a@b.com" }));
			expect(decoded.exp - decoded.iat).toBe(DAY);
			expect(decoded.rem).toBeUndefined();
		});

		it("issues a long-lived token marked as remembered", () => {
			const decoded = decode(AuthService.signToken({ id: "u1", email: "a@b.com" }, true));
			expect(decoded.exp - decoded.iat).toBe(30 * DAY);
			expect(decoded.rem).toBe(true);
		});

		it("uses AUTH_REMEMBER_DAYS for remembered sessions", () => {
			(env as any).AUTH_REMEMBER_DAYS = 14;
			const decoded = decode(AuthService.signToken({ id: "u1", email: "a@b.com" }, true));
			expect(decoded.exp - decoded.iat).toBe(14 * DAY);
			expect(AuthService.maxAge(true)).toBe(14 * DAY);
			expect(AuthService.maxAge(false)).toBe(DAY);
		});
	});

	describe("login", () => {
		const user = { id: "u1", email: "a@b.com", password: "hash" };

		beforeEach(() => {
			jest.spyOn(User, "findOne").mockResolvedValue(user as any);
			jest.spyOn(bcrypt, "compare").mockImplementation(() => Promise.resolve(true));
		});

		it("remembers the session when asked to", async () => {
			const decoded = decode(await AuthService.login({ email: "a@b.com", password: "x", remember: true }));
			expect(decoded.rem).toBe(true);
			expect(decoded.exp - decoded.iat).toBe(30 * DAY);
		});

		it("issues a session token otherwise", async () => {
			const decoded = decode(await AuthService.login({ email: "a@b.com", password: "x" }));
			expect(decoded.rem).toBeUndefined();
		});
	});

	describe("loginWithOidc", () => {
		it("passes the remember choice into the token", async () => {
			jest.spyOn(User, "findOne").mockResolvedValueOnce({ id: "u1", email: "a@b.com", identities: [] } as any);
			const provider = { id: "authelia", name: "Authelia", issuer: "i", clientId: "c", clientSecret: "s", scopes: "openid", allowSignup: true };
			const { token } = await AuthService.loginWithOidc(provider, { sub: "s1", email: "a@b.com", email_verified: true }, true);
			expect(decode(token).rem).toBe(true);
		});
	});

	describe("refresh", () => {
		it("issues a fresh token with the same remember choice", async () => {
			jest.spyOn(User, "findById").mockResolvedValue({ id: "u1", email: "a@b.com" } as any);
			const result = await AuthService.refresh("u1", true);
			expect(User.findById).toHaveBeenCalledWith("u1");
			expect(result.remember).toBe(true);
			expect(decode(result.token)).toMatchObject({ sub: "u1", email: "a@b.com", rem: true });
		});

		it("keeps session tokens short-lived", async () => {
			jest.spyOn(User, "findById").mockResolvedValue({ id: "u1", email: "a@b.com" } as any);
			const result = await AuthService.refresh("u1", false);
			expect(result.remember).toBe(false);
			const decoded = decode(result.token);
			expect(decoded.exp - decoded.iat).toBe(DAY);
		});

		it("rejects deleted users", async () => {
			jest.spyOn(User, "findById").mockResolvedValue(null);
			await expect(AuthService.refresh("gone", true)).rejects.toMatchObject({ status: 401 });
		});
	});
});
