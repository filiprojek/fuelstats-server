import jwt from "jsonwebtoken";
import AuthService from "../src/services/AuthService";
import User from "../src/models/User";
import env from "../src/config/environment";
import { OidcProviderConfig } from "../src/config/oidc";

const provider: OidcProviderConfig = {
	id: "authelia",
	name: "Authelia",
	issuer: "https://auth.example.com",
	clientId: "fuelstats",
	clientSecret: "s",
	scopes: "openid profile email",
	allowSignup: true,
};

const claims = {
	sub: "sub-1",
	email: "John@Example.com",
	email_verified: true,
	preferred_username: "john",
	name: "John Doe",
};

const userDoc = (extra: Record<string, any> = {}) => ({
	id: "u1",
	email: "john@example.com",
	username: "john",
	password: "hash",
	identities: [] as any[],
	save: jest.fn().mockResolvedValue(true),
	...extra,
});

describe("AuthService OIDC", () => {
	afterEach(() => jest.restoreAllMocks());

	describe("signToken", () => {
		it("signs a JWT with sub and email", () => {
			const token = AuthService.signToken({ id: "u1", email: "a@b.com" });
			const decoded: any = jwt.verify(token, env.JWT_SECRET);
			expect(decoded).toMatchObject({ sub: "u1", email: "a@b.com" });
			expect(decoded.exp - decoded.iat).toBe(AuthService.maxAge(false));
		});
	});

	describe("loginWithOidc", () => {
		it("logs in a user that already has the identity linked", async () => {
			const user = userDoc({ identities: [{ provider: "authelia", subject: "sub-1" }] });
			const findOne = jest.spyOn(User, "findOne").mockResolvedValueOnce(user as any);

			const result = await AuthService.loginWithOidc(provider, claims);

			expect(findOne).toHaveBeenCalledWith({ identities: { $elemMatch: { provider: "authelia", subject: "sub-1" } } });
			expect(result).toMatchObject({ userId: "u1", created: false, linked: false });
			expect((jwt.verify(result.token, env.JWT_SECRET) as any).sub).toBe("u1");
			expect(user.save).not.toHaveBeenCalled();
		});

		it("auto-links to an existing account when the email is verified", async () => {
			const user = userDoc();
			const findOne = jest.spyOn(User, "findOne").mockResolvedValueOnce(null).mockResolvedValueOnce(user as any);

			const result = await AuthService.loginWithOidc(provider, claims);

			const emailQuery: any = findOne.mock.calls[1][0];
			expect(emailQuery.email.$regex).toBeInstanceOf(RegExp);
			expect(emailQuery.email.$regex.test("john@example.com")).toBe(true);
			expect(emailQuery.email.$regex.test("xjohn@example.com")).toBe(false);
			expect(user.identities).toEqual([expect.objectContaining({ provider: "authelia", subject: "sub-1", email: "John@Example.com" })]);
			expect(user.save).toHaveBeenCalled();
			expect(result).toMatchObject({ userId: "u1", created: false, linked: true });
		});

		it("escapes regex characters in the email", async () => {
			const findOne = jest.spyOn(User, "findOne").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
			jest.spyOn(User.prototype, "save").mockResolvedValue(true as any);
			await AuthService.loginWithOidc(provider, { ...claims, email: "a+b.c@example.com" });
			const re: RegExp = (findOne.mock.calls[1][0] as any).email.$regex;
			expect(re.test("a+b.c@example.com")).toBe(true);
			expect(re.test("aab-c@example.com")).toBe(false);
		});

		it("refuses to link when the email is not verified", async () => {
			const user = userDoc();
			jest.spyOn(User, "findOne").mockResolvedValueOnce(null).mockResolvedValueOnce(user as any);

			await expect(AuthService.loginWithOidc(provider, { ...claims, email_verified: false })).rejects.toMatchObject({
				status: 409,
				code: "account_exists_unverified",
			});
			expect(user.save).not.toHaveBeenCalled();
		});

		it("creates a new passwordless account when nothing matches", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			const save = jest.spyOn(User.prototype, "save").mockImplementation(function (this: any) {
				return Promise.resolve(this);
			} as any);

			const result = await AuthService.loginWithOidc(provider, claims);

			expect(save).toHaveBeenCalled();
			const created: any = save.mock.contexts[0];
			expect(created.email).toBe("john@example.com");
			expect(created.username).toBe("john");
			expect(created.password).toBeUndefined();
			expect(created.identities[0]).toMatchObject({ provider: "authelia", subject: "sub-1" });
			expect(result).toMatchObject({ userId: created.id, created: true, linked: true });
		});

		it("creates an account even if the email is unverified when no account matches", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			jest.spyOn(User.prototype, "save").mockResolvedValue(true as any);
			await expect(AuthService.loginWithOidc(provider, { ...claims, email_verified: false })).resolves.toMatchObject({ created: true });
		});

		it.each([
			[{ preferred_username: undefined }, "John Doe"],
			[{ preferred_username: undefined, name: undefined }, "John"],
		])("derives the username from fallbacks %#", async (override, expected) => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			const save = jest.spyOn(User.prototype, "save").mockResolvedValue(true as any);
			await AuthService.loginWithOidc(provider, { ...claims, ...override });
			expect((save.mock.contexts[0] as any).username).toBe(expected);
		});

		it("rejects signup when the provider disallows it", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			await expect(AuthService.loginWithOidc({ ...provider, allowSignup: false }, claims)).rejects.toMatchObject({ status: 403, code: "signup_disabled" });
		});

		it("rejects when the provider sends no email and no account is linked", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			await expect(AuthService.loginWithOidc(provider, { sub: "sub-1", email_verified: false })).rejects.toMatchObject({ status: 400, code: "email_missing" });
		});
	});

	describe("linkIdentity", () => {
		it("adds the identity to the user", async () => {
			const user = userDoc();
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			jest.spyOn(User, "findById").mockResolvedValue(user as any);

			await AuthService.linkIdentity("u1", provider, claims);

			expect(user.identities).toEqual([expect.objectContaining({ provider: "authelia", subject: "sub-1" })]);
			expect(user.save).toHaveBeenCalled();
		});

		it("is a no-op when already linked to the same user", async () => {
			const user = userDoc({ identities: [{ provider: "authelia", subject: "sub-1" }] });
			jest.spyOn(User, "findOne").mockResolvedValue(user as any);
			jest.spyOn(User, "findById").mockResolvedValue(user as any);

			await AuthService.linkIdentity("u1", provider, claims);
			expect(user.save).not.toHaveBeenCalled();
		});

		it("rejects when the identity belongs to another user", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(userDoc({ id: "other" }) as any);
			await expect(AuthService.linkIdentity("u1", provider, claims)).rejects.toMatchObject({ status: 409, code: "identity_in_use" });
		});

		it("replaces a different identity of the same provider", async () => {
			const user = userDoc({ identities: [{ provider: "authelia", subject: "old" }] });
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			jest.spyOn(User, "findById").mockResolvedValue(user as any);

			await AuthService.linkIdentity("u1", provider, claims);
			expect(user.identities).toEqual([expect.objectContaining({ provider: "authelia", subject: "sub-1" })]);
		});

		it("rejects when the user does not exist", async () => {
			jest.spyOn(User, "findOne").mockResolvedValue(null);
			jest.spyOn(User, "findById").mockResolvedValue(null);
			await expect(AuthService.linkIdentity("u1", provider, claims)).rejects.toMatchObject({ status: 404 });
		});
	});
});

describe("AuthService account sign-in methods", () => {
	afterEach(() => jest.restoreAllMocks());

	describe("unlinkIdentity", () => {
		it("removes the provider identity when a password exists", async () => {
			const user = userDoc({ identities: [{ provider: "authelia", subject: "s" }] });
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			await AuthService.unlinkIdentity("u1", "authelia");
			expect(user.identities).toEqual([]);
			expect(user.save).toHaveBeenCalled();
		});

		it("allows unlinking when another identity remains", async () => {
			const user = userDoc({
				password: undefined,
				identities: [
					{ provider: "authelia", subject: "s" },
					{ provider: "google", subject: "g" },
				],
			});
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			await AuthService.unlinkIdentity("u1", "authelia");
			expect(user.identities).toEqual([{ provider: "google", subject: "g" }]);
		});

		it("refuses to remove the last sign-in method", async () => {
			const user = userDoc({ password: undefined, identities: [{ provider: "authelia", subject: "s" }] });
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			await expect(AuthService.unlinkIdentity("u1", "authelia")).rejects.toMatchObject({ status: 400, code: "last_sign_in_method" });
			expect(user.save).not.toHaveBeenCalled();
		});

		it("returns 404 when the provider is not linked", async () => {
			jest.spyOn(User, "findById").mockResolvedValue(userDoc() as any);
			await expect(AuthService.unlinkIdentity("u1", "authelia")).rejects.toMatchObject({ status: 404 });
		});

		it("returns 404 when the user does not exist", async () => {
			jest.spyOn(User, "findById").mockResolvedValue(null);
			await expect(AuthService.unlinkIdentity("u1", "authelia")).rejects.toMatchObject({ status: 404 });
		});
	});

	describe("setPassword", () => {
		const bcrypt = require("bcryptjs");

		it("sets a first password on an SSO-only account without the current one", async () => {
			const user = userDoc({ password: undefined });
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			jest.spyOn(bcrypt, "hash").mockResolvedValue("newhash");
			await AuthService.setPassword("u1", { newPassword: "longenough" });
			expect(bcrypt.hash).toHaveBeenCalledWith("longenough", 10);
			expect(user.password).toBe("newhash");
			expect(user.save).toHaveBeenCalled();
		});

		it("requires the correct current password when one exists", async () => {
			const user = userDoc();
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			jest.spyOn(bcrypt, "compare").mockResolvedValue(false);
			await expect(AuthService.setPassword("u1", { currentPassword: "wrong", newPassword: "longenough" })).rejects.toMatchObject({
				status: 401,
				code: "invalid_current_password",
			});
			await expect(AuthService.setPassword("u1", { newPassword: "longenough" })).rejects.toMatchObject({ status: 401 });
			expect(user.save).not.toHaveBeenCalled();
		});

		it("changes the password when the current one matches", async () => {
			const user = userDoc();
			jest.spyOn(User, "findById").mockResolvedValue(user as any);
			jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
			jest.spyOn(bcrypt, "hash").mockResolvedValue("newhash");
			await AuthService.setPassword("u1", { currentPassword: "old", newPassword: "longenough" });
			expect(bcrypt.compare).toHaveBeenCalledWith("old", "hash");
			expect(user.password).toBe("newhash");
		});

		it("rejects passwords shorter than 8 characters", async () => {
			await expect(AuthService.setPassword("u1", { newPassword: "short" })).rejects.toMatchObject({ status: 400, code: "weak_password" });
		});

		it("returns 404 when the user does not exist", async () => {
			jest.spyOn(User, "findById").mockResolvedValue(null);
			await expect(AuthService.setPassword("u1", { newPassword: "longenough" })).rejects.toMatchObject({ status: 404 });
		});
	});
});
