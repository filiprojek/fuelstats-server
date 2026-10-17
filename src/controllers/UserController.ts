import { Request, Response } from "express";
import User from "../models/User";
import AuthService from "../services/AuthService";
import { Err, Succ } from "../services/globalService";

const sendError = (res: Response, err: any) => {
	const status = err.status || 500;
	new Err(status, err.message || err);
	return res.status(status).json({ error: status === 500 ? "Internal server error" : err.message, code: err.code });
};

class UserController {
	static async me(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const user = await User.findById(userId);

			if (!user) {
				new Err(404, `User not found: ${userId}`);
				return res.status(404).json({ message: "User not found" });
			}

			const payload = {
				id: user.id,
				email: user.email,
				username: user.username,
				hasPassword: !!user.password,
				identities: (user.identities || []).map((i: any) => ({ provider: i.provider, email: i.email, linkedAt: i.linkedAt })),
			};
			new Succ(200, "Fetched user profile", payload);
			return res.status(200).json(payload);
		} catch (error: any) {
			new Err(500, error.message || error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}

	static async setPassword(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			await AuthService.setPassword(userId, { currentPassword: req.body?.currentPassword, newPassword: req.body?.newPassword });
			return res.status(200).json({ message: "Password updated" });
		} catch (err: any) {
			return sendError(res, err);
		}
	}

	static async unlinkIdentity(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			await AuthService.unlinkIdentity(userId, String(req.params.provider));
			return res.status(200).json({ message: "Provider unlinked" });
		} catch (err: any) {
			return sendError(res, err);
		}
	}
}

export default UserController;
