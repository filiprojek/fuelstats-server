import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import AuthRoutes from "../src/routes/AuthRoutes";
import AuthService from "../src/services/AuthService";

jest.mock("../src/services/AuthService");
const app = express();
app.use(bodyParser.json());
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
