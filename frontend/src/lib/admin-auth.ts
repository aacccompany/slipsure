// HMAC-SHA256 token — works in both Edge (middleware) and Node.js (server actions)

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const pairs = hex.match(/.{2}/g) ?? [];
  const buf = new ArrayBuffer(pairs.length);
  const view = new Uint8Array(buf);
  pairs.forEach((b, i) => { view[i] = parseInt(b, 16); });
  return buf;
}

export async function createAdminToken(secret: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 86_400; // 24 h
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiry)));
  return `${expiry}.${toHex(sig)}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  try {
    const dot = token.indexOf('.');
    if (dot === -1) return false;
    const expiry = token.slice(0, dot);
    const sigHex = token.slice(dot + 1);
    const expiryNum = Number(expiry);
    if (!isFinite(expiryNum) || expiryNum <= 0) return false;
    if (Math.floor(Date.now() / 1000) > expiryNum) return false;
    const key = await getKey(secret);
    return crypto.subtle.verify('HMAC', key, fromHex(sigHex), new TextEncoder().encode(expiry));
  } catch {
    return false;
  }
}
