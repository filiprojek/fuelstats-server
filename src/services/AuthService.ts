import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/environment";
import { Err, Succ } from "../services/globalService";
import { OidcProviderConfig } from "../config/oidc";
import { OidcClaims } from "./OidcService";

const authError = (status: number, message: string, code?: string, data?: any) => {
	const error: any = new Error(message);
	error.status = status;
	if (code) error.code = code;
	new Err(status, message, data);
	return error;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class AuthService {
	/**
	 * Constant that stores JWT expire time in seconds
	 */
	static jwtMaxAge = 3 * 24 * 60 * 60; // 3 days in seconds

	/**
	 * Register a new user with email/password.
	 * @returns The created user's id, email, and username.
	 */
	static async register(data: { email: string; password: string; username?: string }): Promise<{ id: string; email: string; username?: string }> {
		const existing = await User.findOne({ email: data.email });
		if (existing) {
			const error: any = new Error("Email already in use");
			error.status = 409;
			new Err(error.status, "Registration failed", { email: data.email });
			throw error;
		}

		const hashed = await bcrypt.hash(data.password, 10);
		const user = new User({
			email: data.email,
			password: hashed,
			username: data.username,
		});
		await user.save();

		new Succ(201, `User ${user.id} registered`);
		return { id: user.id, email: user.email, username: user.username };
	}

	/**
	 * Authenticate a user and issue a JWT.
	 * @returns A signed JWT token.
	 */
	static async login(data: { email: string; password: string }): Promise<string> {
		const user = await User.findOne({ email: data.email });
		if (!user || !user.password) {
			const error: any = new Error("Invalid credentials");
			error.status = 401;
			new Err(error.status, "Authentication failed", {
				email: data.email,
			});
			throw error;
		}

		const valid = await bcrypt.compare(data.password, user.password);
		if (!valid) {
			const error: any = new Error("Invalid credentials");
			error.status = 401;
			new Err(error.status, "Authentication failed", {
				email: data.email,
			});
			throw error;
		}

		const token = this.signToken(user);
		new Succ(200, `Token issued for user ${user.id}`);
		return token;
	}

	/**
	 * Issue a session JWT for a user.
	 */
	static signToken(user: { id?: string; email: string }): string {
		return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
			expiresIn: this.jwtMaxAge,
		});
	}

	/**
	 * Sign in through an OpenID Connect provider.
	 * Resolution order: linked identity -> existing account with the same verified email (auto-link) -> new account.
	 */
	static async loginWithOidc(
		provider: OidcProviderConfig,
		claims: OidcClaims,
	): Promise<{ token: string; userId: string; created: boolean; linked: boolean }> {
		const identity = { provider: provider.id, subject: claims.sub, email: claims.email, linkedAt: new Date() };

		const linkedUser = await User.findOne({ identities: { $elemMatch: { provider: provider.id, subject: claims.sub } } });
		if (linkedUser) {
			new Succ(200, `User ${linkedUser.id} signed in with ${provider.id}`);
			return { token: this.signToken(linkedUser), userId: linkedUser.id, created: false, linked: false };
		}

		if (!claims.email) {
			throw authError(400, `${provider.name} did not provide an email address`, "email_missing", { provider: provider.id, sub: claims.sub });
		}

		const existing = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(claims.email)}$`, "i") } });
		if (existing) {
			if (!claims.email_verified) {
				throw authError(409, `An account with this email exists; sign in with your password and link ${provider.name} in settings`, "account_exists_unverified", {
					provider: provider.id,
					email: claims.email,
				});
			}
			existing.identities.push(identity);
			await existing.save();
			new Succ(200, `Linked ${provider.id} identity to user ${existing.id} by verified email`);
			return { token: this.signToken(existing), userId: existing.id, created: false, linked: true };
		}

		if (!provider.allowSignup) {
			throw authError(403, `Sign up through ${provider.name} is disabled`, "signup_disabled", { provider: provider.id, email: claims.email });
		}

		const user = new User({
			email: claims.email.toLowerCase(),
			username: claims.preferred_username || claims.name || claims.email.split("@")[0],
			identities: [identity],
		});
		await user.save();
		new Succ(201, `User ${user.id} registered through ${provider.id}`);
		return { token: this.signToken(user), userId: user.id, created: true, linked: true };
	}

	/**
	 * Link an OpenID Connect identity to an already authenticated user.
	 */
	static async linkIdentity(userId: string, provider: OidcProviderConfig, claims: OidcClaims): Promise<void> {
		const owner = await User.findOne({ identities: { $elemMatch: { provider: provider.id, subject: claims.sub } } });
		if (owner && owner.id !== userId) {
			throw authError(409, `This ${provider.name} account is already linked to another user`, "identity_in_use", { provider: provider.id, userId });
		}
		if (owner) return;

		const user = await User.findById(userId);
		if (!user) {
			throw authError(404, "User not found", "user_not_found", { userId });
		}
		const others = user.identities.filter((i: any) => i.provider !== provider.id);
		user.identities = [...others, { provider: provider.id, subject: claims.sub, email: claims.email, linkedAt: new Date() }] as any;
		await user.save();
		new Succ(200, `Linked ${provider.id} identity to user ${user.id}`);
	}
}

export default AuthService;
