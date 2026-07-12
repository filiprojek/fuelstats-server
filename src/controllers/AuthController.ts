import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import { Err, Succ } from "../services/globalService";

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
			const token = await AuthService.login(req.body);
			// log success
			new Succ(200, `User ${req.body.email} authenticated`);
			res.cookie("jwt", token, { httpOnly: true, maxAge: AuthService.jwtMaxAge * 1000 });
			res.cookie("auth", true, { httpOnly: false, maxAge: AuthService.jwtMaxAge * 1000 });
			return res.status(200).json({ token });
		} catch (err: any) {
			const status = err.status || 500;
			new Err(status, err.message);
			res.cookie("jwt", "", { httpOnly: true, maxAge: 0 });
			res.cookie("auth", false, { httpOnly: false, maxAge: 0 });
			return res.status(status).json({ error: err.message });
		}
	}

	static async signout(req: Request, res: Response) {
		res.cookie("jwt", "", { httpOnly: true, maxAge: 0 });
		res.cookie("auth", false, { httpOnly: false, maxAge: 0 });
		new Succ(200, `User was signed out`);
		return res.status(200).json({ message: "User was signed out" });
	}
}

export default AuthController;
