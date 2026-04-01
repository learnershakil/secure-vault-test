import { NextResponse } from 'next/server';
import { decryptAES, encryptAES } from '../../../../lib/cryptoEdge';
import { emitLog } from '../../../../lib/logger';

// Vercel Edge Runtime for faster cryptography
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const sessionToken = authHeader.replace('Bearer ', '');

    const body = await req.json();
    
    // 1. Decrypt incoming payload
    let plaintextPayload = '';
    try {
      plaintextPayload = await decryptAES(sessionToken, body.iv, body.ciphertext);
      emitLog('AES_DECRYPT_SUCCESS', 'Successfully decrypted incoming payload');
    } catch (e: any) {
      emitLog('AES_DECRYPT_FAIL', 'Failed to decrypt incoming payload', { error: e.message });
      return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
    }

    const requestData = JSON.parse(plaintextPayload);
    
    // Process the Secure Request...
    const responseData = {
      message: 'Secure Vault Data Retrieved',
      requestedAction: requestData.action,
      balance: "$1,000,000.00",
      topSecretCode: "OMEGA-X-99",
      serverTimestamp: Date.now()
    };

    // 2. Encrypt outgoing response payload
    const encryptedResponse = await encryptAES(sessionToken, JSON.stringify(responseData));
    
    emitLog('AES_ENCRYPT_SUCCESS', 'Successfully encrypted outgoing response data');

    return NextResponse.json(encryptedResponse);

  } catch (error: any) {
    emitLog('VAULT_ERROR', 'Secure data route failed', { error: error.message });
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
