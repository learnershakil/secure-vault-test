import { SECRETS } from './config';

// Uses Web Crypto API for Edge compatibility in Next.js middleware

/** 
 * Computes an HMAC-SHA256 signature
 */
export async function computeHMAC(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  
  const keyMatch = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', keyMatch, enc.encode(data));
  return bufferToHex(signature);
}

/**
 * Validates HMAC signature dynamically
 */
export async function verifySignature(
  signature: string, 
  body: string, 
  timestamp: string, 
  nonce: string
): Promise<boolean> {
  const payloadToSign = `${body}${timestamp}${nonce}`;
  const expectedSignature = await computeHMAC(SECRETS.HMAC_SECRET, payloadToSign);
  return signature === expectedSignature;
}

/**
 * Derives a 256-bit AES key: SHA256(session_token + HMAC secret)
 */
export async function deriveAESKey(sessionToken: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = enc.encode(sessionToken + SECRETS.HMAC_SECRET);
  const hash = await crypto.subtle.digest('SHA-256', material);
  
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Decrypts AES-CBC payload from mobile (crypto-js format)
 * Mobile sends: { iv: 'hex', ciphertext: 'base64' }
 */
export async function decryptAES(sessionToken: string, ivHex: string, ciphertextB64: string): Promise<string> {
  const key = await deriveAESKey(sessionToken);
  const iv = hexToBuffer(ivHex);
  
  // crypto-js outputs Base64 ciphertext 
  const ciphertextBinary = base64ToBuffer(ciphertextB64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    ciphertextBinary
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts AES-CBC payload (response to mobile)
 */
export async function encryptAES(sessionToken: string, plaintext: string): Promise<{ iv: string, ciphertext: string }> {
  const key = await deriveAESKey(sessionToken);
  const iv = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes for AES-CBC
  const enc = new TextEncoder();

  // PKCS7 padding (AES-CBC requires it in Web Crypto)
  const data = enc.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    data
  );

  return {
    iv: bufferToHex(iv.buffer),
    ciphertext: bufferToBase64(encryptedBuffer)
  };
}

// Helpers
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64ToBuffer(b64: string): Uint8Array {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
