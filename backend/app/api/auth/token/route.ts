import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SECRETS } from '../../../../lib/config';
import { emitLog } from '../../../../lib/logger';

// Force Node.js runtime to allow 'jsonwebtoken' package if needed
export const runtime = 'nodejs';

// Mock DB for Refresh Tokens
const validRefreshTokens = new Set<string>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, refreshToken } = body;

    // 1. Handle Refresh Token Rotation
    if (refreshToken) {
      if (!validRefreshTokens.has(refreshToken)) {
        emitLog('AUTH_FAIL', 'Attempted to use invalid/revoked Refresh Token', { ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid Refresh Token' }, { status: 401 });
      }

      jwt.verify(refreshToken, SECRETS.JWT_SECRET);
      validRefreshTokens.delete(refreshToken); // Rotate it out

      const payload = { user: 'existing_user', role: 'admin' };
      const newTokens = generateTokens(payload);
      
      emitLog('AUTH_SUCCESS', 'Refresh Token Rotated successfully');
      return NextResponse.json(newTokens);
    }

    // 2. Handle Initial Login
    if (username === 'admin' && password === 'admin123') { // Mock secure validation
      const payload = { user: 'admin', role: 'admin' };
      const tokens = generateTokens(payload);
      
      emitLog('AUTH_SUCCESS', 'User logged in successfully', { username });
      return NextResponse.json(tokens);
    }

    emitLog('AUTH_FAIL', 'Invalid credentials', { username });
    return NextResponse.json({ error: 'Invalid Credentials' }, { status: 401 });

  } catch (error: any) {
    emitLog('AUTH_ERROR', 'Token generation/verification failed', { error: error.message });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function generateTokens(payload: any) {
  const accessToken = jwt.sign(payload, SECRETS.JWT_SECRET, { expiresIn: '5m' }); // Strict 5m expiry
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, SECRETS.JWT_SECRET, { expiresIn: '7d' });
  
  validRefreshTokens.add(refreshToken);
  
  return { accessToken, refreshToken };
}
