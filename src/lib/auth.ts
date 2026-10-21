import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'it-system-default-jwt-secret-key-change-in-wrangler-toml'
);

// Hashing password using standard Web Crypto API (Edge-native, PBKDF2 with SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pbkdf2Key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    pbkdf2Key,
    256
  );
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyHex = Array.from(new Uint8Array(key)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${keyHex}`;
}

// Verifying PBKDF2 hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, keyHex] = parts;
  
  const encoder = new TextEncoder();
  const saltMatch = saltHex.match(/.{1,2}/g);
  if (!saltMatch) return false;
  const salt = new Uint8Array(saltMatch.map(byte => parseInt(byte, 16)));
  
  const pbkdf2Key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    pbkdf2Key,
    256
  );
  
  const derivedHex = Array.from(new Uint8Array(key)).map(b => b.toString(16).padStart(2, '0')).join('');
  return derivedHex === keyHex;
}

// Create Session JWT
export async function createSessionToken(payload: { id: number; email: string; name: string; role: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

// Verify Session JWT
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; email: string; name: string; role: 'ADMIN' | 'TECH' | 'USER' | 'APPROVER' };
  } catch (error) {
    return null;
  }
}
