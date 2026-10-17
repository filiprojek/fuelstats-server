import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import User from "../src/models/User";
import AuthService from "../src/services/AuthService";
import env from "../src/config/environment";

const userId = "123";
const token = () => jwt.sign({ sub: userId, email: "test@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

describe("UsersController – GET /api/v1/user/me", () => {
	const linkedAt = new Date("2026-01-02T03:04:05.000Z");
	const userRecord = {
		id: userId,
		email: "test@example.com",
		username: "Test",
		password: "hash",
		identities: [{ provider: "authelia", subject: "secret-sub", email: "test@example.com", linkedAt }],
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("should return 401 if no Authorization header is present", async () => {
		const res = await request(app).get("/api/v1/user/me");
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("should return 401 if the token is invalid", async () => {
		const res = await request(app).get("/api/v1/user/me").set("Authorization", "Bearer invalid.token.here");
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Invalid") });
	});

	it("should return the user profile with sign-in methods for a valid token", async () => {
		jest.spyOn(User, "findById").mockResolvedValue(userRecord as any);

		const res = await request(app).get("/api/v1/user/me").set("Authorization", `Bearer ${token()}`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			id: userId,
			email: userRecord.email,
			username: userRecord.username,
			hasPassword: true,
			identities: [{ provider: "authelia", email: "test@example.com", linkedAt: linkedAt.toISOString() }],
		});
	});

	it("reports hasPassword false and empty identities for legacy/SSO-only users", async () => {
		jest.spyOn(User, "findById").mockResolvedValue({ id: userId, email: "a@b.com", username: "A" } as any);
		const res = await request(app).get("/api/v1/user/me").set("Authorization", `Bearer ${token()}`);
		expect(res.body).toMatchObject({ hasPassword: false, identities: [] });
	});

	it("returns 404 when the user no longer exists", async () => {
		jest.spyOn(User, "findById").mockResolvedValue(null);
		const res = await request(app).get("/api/v1/user/me").set("Authorization", `Bearer ${token()}`);
		expect(res.status).toBe(404);
	});

	it("returns 500 when the lookup fails", async () => {
		jest.spyOn(User, "findById").mockRejectedValue(new Error("db down"));
		const res = await request(app).get("/api/v1/user/me").set("Authorization", `Bearer ${token()}`);
		expect(res.status).toBe(500);
	});
});

describe("UsersController – PUT /api/v1/user/password", () => {
	afterEach(() => jest.restoreAllMocks());

	it("requires authentication", async () => {
		const res = await request(app).put("/api/v1/user/password").send({ newPassword: "longenough" });
		expect(res.status).toBe(401);
	});

	it("sets the password", async () => {
		const spy = jest.spyOn(AuthService, "setPassword").mockResolvedValue(undefined);
		const res = await request(app).put("/api/v1/user/password").set("Authorization", `Bearer ${token()}`).send({ currentPassword: "old", newPassword: "longenough" });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: "Password updated" });
		expect(spy).toHaveBeenCalledWith(userId, { currentPassword: "old", newPassword: "longenough" });
	});

	it("returns the service error status and code", async () => {
		jest.spyOn(AuthService, "setPassword").mockRejectedValue(Object.assign(new Error("Current password is incorrect"), { status: 401, code: "invalid_current_password" }));
		const res = await request(app).put("/api/v1/user/password").set("Authorization", `Bearer ${token()}`).send({ newPassword: "longenough" });
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ error: "Current password is incorrect", code: "invalid_current_password" });
	});
});

describe("UsersController – DELETE /api/v1/user/identities/:provider", () => {
	afterEach(() => jest.restoreAllMocks());

	it("requires authentication", async () => {
		const res = await request(app).delete("/api/v1/user/identities/authelia");
		expect(res.status).toBe(401);
	});

	it("unlinks the provider", async () => {
		const spy = jest.spyOn(AuthService, "unlinkIdentity").mockResolvedValue(undefined);
		const res = await request(app).delete("/api/v1/user/identities/authelia").set("Authorization", `Bearer ${token()}`);
		expect(res.status).toBe(200);
		expect(spy).toHaveBeenCalledWith(userId, "authelia");
	});

	it("returns 400 when it is the last sign-in method", async () => {
		jest.spyOn(AuthService, "unlinkIdentity").mockRejectedValue(Object.assign(new Error("last"), { status: 400, code: "last_sign_in_method" }));
		const res = await request(app).delete("/api/v1/user/identities/authelia").set("Authorization", `Bearer ${token()}`);
		expect(res.status).toBe(400);
		expect(res.body.code).toBe("last_sign_in_method");
	});

	it("defaults to 500 for unexpected errors", async () => {
		jest.spyOn(AuthService, "unlinkIdentity").mockRejectedValue(new Error("boom"));
		const res = await request(app).delete("/api/v1/user/identities/authelia").set("Authorization", `Bearer ${token()}`);
		expect(res.status).toBe(500);
	});
});
