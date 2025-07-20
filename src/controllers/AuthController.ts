import { Request, Response } from 'express';
import AuthService from '../services/AuthService';
import { Err, Succ } from '../services/globalService';

class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const user = await AuthService.register(req.body);
      // log success
      new Succ(201, `User ${user.id} created`, user);
      return res.status(201).json({ message: 'User created', user });
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
      return res.status(200).json({ token });
    } catch (err: any) {
      const status = err.status || 500;
      new Err(status, err.message);
      return res.status(status).json({ error: err.message });
    }
  }
}

export default AuthController;
