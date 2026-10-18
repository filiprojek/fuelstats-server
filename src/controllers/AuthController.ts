import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import { Err, Succ } from "../services/globalService";
import { clearAuthCookies, isRemember, setAuthCookies } from "../utils/authCookies";

class AuthController {
	static async signup(req: Request, res: Response) {
		try {
			const user = await AuthService.register(req.body);
			// log success
			new Succ(201, `User ${user.id} created`, user);
			return res.status(201).json({ message: "User created", user });
		} catch (err: any) {
			const status = err.status || 500;
			new Err(status, err.message, err.data);
			return res.status(status).json({ error: err.message });
		}
	}

	static async signin(req: Request, res: Response) {
		try {
			const remember = isRemember(req.body?.remember);
			const token = await AuthService.login({ email: req.body.email, password: req.body.password, remember });
			// log success
			new Succ(200, `User ${req.body.email} authenticated`);
			setAuthCookies(res, token, remember);
			return res.status(200).json({ token, remember });
		} catch (err: any) {
			const status = err.status || 500;
			new Err(status, err.message);
			clearAuthCookies(res);
			return res.status(status).json({ error: err.message });
		}
	}

	/**
	 * POST /auth/refresh - renew the current session token (sliding expiration)
	 */
	static async refresh(req: Request, res: Response) {
		try {
			const user = (req as any).user;
			const { token, remember } = await AuthService.refresh(String(user.sub), user.rem === true);
			setAuthCookies(res, token, remember);
			return res.status(200).json({ token, remember });
		} catch (err: any) {
			const status = err.status || 500;
			new Err(status, err.message);
			if (status === 401) clearAuthCookies(res);
			return res.status(status).json({ error: err.message });
		}
	}

	static async signout(req: Request, res: Response) {
		clearAuthCookies(res);
		new Succ(200, `User was signed out`);
		return res.status(200).json({ message: "User was signed out" });
	}
}

export default AuthController;
