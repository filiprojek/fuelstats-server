import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import User from '../src/models/User';
import env from '../src/config/environment';

describe('UsersController – GET /api/v1/user/me', () => {
  const userId = '123';
  const userRecord = {
    id: userId,
    email: 'test@example.com',
    username: 'Test'
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return 401 if no Authorization header is present', async () => {
    const res = await request(app).get('/api/v1/user/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: expect.stringContaining('Unauthorized') });
  });

  it('should return 401 if the token is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/user/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: expect.stringContaining('Invalid') });
  });

  it('should return the user profile for a valid token', async () => {
    // Stub the lookup
    jest.spyOn(User, 'findById').mockResolvedValue(userRecord as any);

    // Generate a JWT with our test secret
    const token = jwt.sign(
      { sub: userId, email: userRecord.email },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: userId,
      email: userRecord.email,
      username: userRecord.username
    });
  });
});
