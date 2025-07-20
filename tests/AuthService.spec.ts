import AuthService from '../src/services/AuthService';
import User from '../src/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  const testUser = {
    id: '123',
    email: 'test@example.com',
    password: 'hashed',
    name: 'Test',
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should throw 409 error if email already exists', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(testUser as any);
      await expect(
        AuthService.register({ email: 'test@example.com', password: 'pass' })
      ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
    });

    it('should hash password and save new user', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const saveMock = jest.fn().mockResolvedValue(true);
      jest.spyOn(bcrypt as any, 'hash')
        .mockImplementation(() => Promise.resolve('hashedpass'));
      jest.spyOn(User.prototype, 'save').mockImplementation(saveMock as any);

      const result = await AuthService.register({
        email: 'new@example.com',
        password: 'pass',
        name: 'New',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toMatchObject({ email: 'new@example.com', name: 'New' });
    });
  });

  describe('login', () => {
    it('should throw 401 if user not found', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      await expect(
        AuthService.login({ email: 'no@user.com', password: 'pass' })
      ).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
    });

    it('should throw 401 if password invalid', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(testUser as any);
      jest.spyOn(bcrypt as any, 'compare')
        .mockImplementation(() => Promise.resolve(false));
      await expect(
        AuthService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
    });

    it('should return JWT token on success', async () => {
      jest
        .spyOn(User, 'findOne')
        .mockResolvedValue({ ...testUser, password: 'hashedpass' } as any);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      jest.spyOn(jwt as any, 'sign').mockImplementation(() => 'token123');

      const token = await AuthService.login({
        email: 'test@example.com',
        password: 'pass',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '123', email: 'test@example.com' }),
        expect.any(String),
        { expiresIn: '1h' }
      );
      expect(token).toBe('token123');
    });
  });
});
