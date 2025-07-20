import { Router } from 'express';
import UserController from '../controllers/UserController';
import { requireAuth } from '../middlewares/AuthMiddleware';

const router = Router();

router.get('/me', requireAuth, UserController.me);

export default router;

