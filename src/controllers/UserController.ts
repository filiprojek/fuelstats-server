import { Request, Response } from 'express';
import User from '../models/User';
import { Err, Succ } from '../services/globalService';

class UserController {
  static async me(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.sub as string;
      const user = await User.findById(userId);

      if (!user) {
        new Err(404, `User not found: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
      };
      new Succ(200, 'Fetched user profile', payload);
      return res.status(200).json(payload);
    } catch (error: any) {
      new Err(500, error.message || error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default UserController;

