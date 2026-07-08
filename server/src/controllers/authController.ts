import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

// 登录
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }
    const result = await pool.query(
      'SELECT id, username, password_hash, role, display_name FROM pf_users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    await pool.query(
      'UPDATE pf_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    const token = generateToken({ userId: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证 token
authRouter.get('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await pool.query(
      'SELECT id, username, role, display_name FROM pf_users WHERE id = $1',
      [user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }
    const dbUser = result.rows[0];
    res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        displayName: dbUser.display_name,
      },
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: '验证失败' });
  }
});
