import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECRETS } from './lib/config';
import { verifySignature } from './lib/cryptoEdge';

// In-Memory Nonce Cache (For production, use Redis e.g., @upstash/redis)
const usedNonces = new Set<string>();

export async function middleware(req: NextRequest) {
  // Only apply strict security to /api/vault routes
  if (req.nextUrl.pathname.startsWith('/api/vault')) {
    
    // 1. Kill Switch - Check App Version
    const appVersion = req.headers.get('x-app-version');
    if (!appVersion || isVersionOutdated(appVersion, SECRETS.MIN_APP_VERSION)) {
      return new NextResponse(
        JSON.stringify({ error: 'FORCE_UPDATE', message: 'App version is too old. Please update.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. App Attestation (Play Integrity / DeviceCheck Mock)
    const playIntegrityToken = req.headers.get('x-play-integrity-token');
    if (!playIntegrityToken) {
      return new NextResponse(
        JSON.stringify({ error: 'ATTESTATION_FAILED', message: 'Missing App Attestation Token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. HMAC Validation (Timestamp + Nonce + Body)
    const signature = req.headers.get('x-hmac-signature');
    const timestampStr = req.headers.get('x-timestamp');
    const nonce = req.headers.get('x-nonce');
    const authHeader = req.headers.get('authorization');

    if (!signature || !timestampStr || !nonce || !authHeader) {
      return new NextResponse(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Security Headers' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Replay Attack Prevention (Nonce Check)
    if (usedNonces.has(nonce)) {
      return new NextResponse(
        JSON.stringify({ error: 'REPLAY_ATTACK', message: 'Nonce already used' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Valid Timestamp Check (max 2 minutes old)
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    if (isNaN(timestamp) || now - timestamp > 120_000) {
      return new NextResponse(
        JSON.stringify({ error: 'EXPIRED_REQUEST', message: 'Request timestamp is too old (> 2m)' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reconstruct body for HMAC validation
    const clonedReq = req.clone();
    const bodyStr = await clonedReq.text(); // can be empty string for GET

    const isValidHMAC = await verifySignature(signature, bodyStr, timestampStr, nonce);

    if (!isValidHMAC) {
      return new NextResponse(
        JSON.stringify({ error: 'INVALID_SIGNATURE', message: 'HMAC signature verification failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add nonce to used list (cleanup logic would be needed in production)
    usedNonces.add(nonce);
    
    // Optional: Prune Nonces periodically to prevent memory leak
    if (usedNonces.size > 10000) usedNonces.clear(); 
  }

  return NextResponse.next();
}

// Simple version compare: returns true if v1 < v2
function isVersionOutdated(v1: string, v2: string) {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (p1[i] < p2[i]) return true;
    if (p1[i] > p2[i]) return false;
  }
  return false;
}

export const config = {
  matcher: '/api/:path*',
};
