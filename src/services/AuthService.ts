import User from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import env from '../config/environment'
import { Err, Succ } from '../services/globalService'

class AuthService {
	/**
	 * Register a new user with email/password.
	 * @returns The created user's id, email, and name.
	 */
	static async register(data: { email: string; password: string; name?: string }): Promise<{ id: string; email: string; name?: string }> {
		const existing = await User.findOne({ email: data.email })
		if (existing) {
			const error: any = new Error('Email already in use')
			error.status = 409
			new Err(error.status, 'Registration failed', { email: data.email })
			throw error
		}

		const hashed = await bcrypt.hash(data.password, 10)
		const user = new User({
			email: data.email,
			password: hashed,
			name: data.name
		})
		await user.save()

		new Succ(201, `User ${user.id} registered`)
		return { id: user.id, email: user.email, name: user.name }
	}

	/**
	 * Authenticate a user and issue a JWT.
	 * @returns A signed JWT token.
	 */
	static async login(data: { email: string; password: string }): Promise<string> {
		const user = await User.findOne({ email: data.email })
		if (!user) {
			const error: any = new Error('Invalid credentials')
			error.status = 401
			new Err(error.status, 'Authentication failed', {
				email: data.email
			})
			throw error
		}

		const valid = await bcrypt.compare(data.password, user.password)
		if (!valid) {
			const error: any = new Error('Invalid credentials')
			error.status = 401
			new Err(error.status, 'Authentication failed', {
				email: data.email
			})
			throw error
		}

		const payload = { sub: user.id, email: user.email }
		const token = jwt.sign(payload, env.JWT_SECRET, {
			expiresIn: '1h'
		})

		new Succ(200, `Token issued for user ${user.id}`)
		return token
	}
}

export default AuthService
