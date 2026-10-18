import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import AuthRoutes from "../src/routes/AuthRoutes";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import AuthService from "../src/services/AuthService";
import env from "../src/config/environment";

jest.mock("../src/services/AuthService");
const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/api/v1/auth", AuthRoutes);

describe("AuthController", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("POST /api/v1/auth/signup", () => {
		it("returns 201 and user on success", async () => {
			(AuthService.register as jest.Mock).mockResolvedValue({ id: "1", email: "a@b.com", username: "A" });
			const res = await request(app).post("/api/v1/auth/signup").send({ email: "a@b.com", password: "pass", username: "A" });
			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("user");
		});

		it("returns error status on failure", async () => {
			(AuthService.register as jest.Mock).mockRejectedValue({ status: 409, message: "Email taken" });
			const res = await request(app).post("/api/v1/auth/signup").send({ email: "a@b.com", password: "pass" });
			expect(res.status).toBe(409);
			expect(res.body).toHaveProperty("error", "Email taken");
		});
	});

	describe("POST /api/v1/auth/signin", () => {
		it("returns token on success", async () => {
			(AuthService.login as jest.Mock).mockResolvedValue("tokenxyz");
			const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "pass" });
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty("token", "tokenxyz");
		});

		it("returns error status on failure", async () => {
			(AuthService.login as jest.Mock).mockRejectedValue({ status: 401, message: "Invalid credentials" });
			const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "pass" });
			expect(res.status).toBe(401);
			expect(res.body).toHaveProperty("error", "Invalid credentials");
		});
	});
});

describe("AuthController cookies", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("sets jwt and auth cookies on successful signin", async () => {
		(AuthService.login as jest.Mock).mockResolvedValue("tokenxyz");
		const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "pass" });
		const cookies = ([] as string[]).concat(res.headers["set-cookie"] as any);
		expect(cookies.some((c) => c.startsWith("jwt=tokenxyz") && c.includes("HttpOnly"))).toBe(true);
		expect(cookies.some((c) => c.startsWith("auth=true"))).toBe(true);
	});

	it("clears cookies on failed signin", async () => {
		(AuthService.login as jest.Mock).mockRejectedValue({ status: 401, message: "Invalid credentials" });
		const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "x" });
		const cookies = ([] as string[]).concat(res.headers["set-cookie"] as any);
		expect(cookies.some((c) => c.startsWith("jwt=;"))).toBe(true);
	});

	it("defaults to 500 when the error has no status", async () => {
		(AuthService.login as jest.Mock).mockRejectedValue(new Error("boom"));
		const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "x" });
		expect(res.status).toBe(500);
	});

	it("POST /signout clears cookies", async () => {
		const res = await request(app).post("/api/v1/auth/signout");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: "User was signed out" });
		const cookies = ([] as string[]).concat(res.headers["set-cookie"] as any);
		expect(cookies.some((c) => c.startsWith("jwt=;"))).toBe(true);
		expect(cookies.some((c) => c.startsWith("auth=false"))).toBe(true);
	});
});

describe("AuthController remember me", () => {
	const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers["set-cookie"] as any) || []);

	beforeEach(() => {
		jest.resetAllMocks();
		(AuthService.maxAge as jest.Mock).mockImplementation((remember: boolean) => (remember ? 30 * 86400 : 86400));
	});

	it.each([true, "true"])("keeps the cookies for the remembered lifetime when remember=%p", async (remember) => {
		(AuthService.login as jest.Mock).mockResolvedValue("tok");
		const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "pass", remember });
		expect(AuthService.login).toHaveBeenCalledWith({ email: "a@b.com", password: "pass", remember: true });
		expect(res.body).toEqual({ token: "tok", remember: true });
		const jwtCookie = cookiesOf(res).find((c) => c.startsWith("jwt=tok"))!;
		expect(jwtCookie).toMatch(/Max-Age=2592000/);
		expect(cookiesOf(res).find((c) => c.startsWith("auth=true"))).toMatch(/Max-Age=2592000/);
	});

	it("uses browser-session cookies without remember", async () => {
		(AuthService.login as jest.Mock).mockResolvedValue("tok");
		const res = await request(app).post("/api/v1/auth/signin").send({ email: "a@b.com", password: "pass" });
		expect(AuthService.login).toHaveBeenCalledWith({ email: "a@b.com", password: "pass", remember: false });
		expect(res.body).toEqual({ token: "tok", remember: false });
		const jwtCookie = cookiesOf(res).find((c) => c.startsWith("jwt=tok"))!;
		expect(jwtCookie).not.toMatch(/Max-Age|Expires/);
	});

	describe("POST /refresh", () => {
		const sign = (claims: Record<string, any>) => jwt.sign(claims, env.JWT_SECRET, { expiresIn: 60 });

		it("requires authentication", async () => {
			const res = await request(app).post("/api/v1/auth/refresh");
			expect(res.status).toBe(401);
		});

		it("renews a remembered session", async () => {
			(AuthService.refresh as jest.Mock).mockResolvedValue({ token: "new", remember: true });
			const res = await request(app).post("/api/v1/auth/refresh").set("Authorization", `Bearer ${sign({ sub: "u1", email: "a@b.com", rem: true })}`);
			expect(res.status).toBe(200);
			expect(AuthService.refresh).toHaveBeenCalledWith("u1", true);
			expect(res.body).toEqual({ token: "new", remember: true });
			expect(cookiesOf(res).find((c) => c.startsWith("jwt=new"))).toMatch(/Max-Age=2592000/);
		});

		it("renews a session token as a session token", async () => {
			(AuthService.refresh as jest.Mock).mockResolvedValue({ token: "new", remember: false });
			const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", `jwt=${sign({ sub: "u1", email: "a@b.com" })}`);
			expect(AuthService.refresh).toHaveBeenCalledWith("u1", false);
			expect(cookiesOf(res).find((c) => c.startsWith("jwt=new"))).not.toMatch(/Max-Age/);
		});

		it("clears the session when the user no longer exists", async () => {
			(AuthService.refresh as jest.Mock).mockRejectedValue({ status: 401, message: "User not found" });
			const res = await request(app).post("/api/v1/auth/refresh").set("Authorization", `Bearer ${sign({ sub: "gone" })}`);
			expect(res.status).toBe(401);
			expect(res.body).toEqual({ error: "User not found" });
			expect(cookiesOf(res).some((c) => c.startsWith("jwt=;"))).toBe(true);
		});

		it("defaults to 500 on unexpected errors", async () => {
			(AuthService.refresh as jest.Mock).mockRejectedValue(new Error("db"));
			const res = await request(app).post("/api/v1/auth/refresh").set("Authorization", `Bearer ${sign({ sub: "u1" })}`);
			expect(res.status).toBe(500);
		});
	});
});
