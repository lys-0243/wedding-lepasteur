const encoder = new TextEncoder();

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a payload into a JWT token using the Web Crypto API.
 */
export async function signToken(payload: Record<string, any>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  const message = `${header}.${data}`;
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${message}.${signature}`;
}

/**
 * Verify a JWT token and decode its payload using the Web Crypto API.
 */
export async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;
    const message = `${header}.${data}`;
    const key = await getCryptoKey(secret);
    
    // Decode signature
    const signatureBinary = atob(signature.replace(/-/g, "+").replace(/_/g, "/"));
    const signatureBytes = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signatureBytes[i] = signatureBinary.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(message));
    if (!isValid) return null;
    
    const payloadJson = decodeURIComponent(escape(atob(data.replace(/-/g, "+").replace(/_/g, "/"))));
    const payload = JSON.parse(payloadJson);
    
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
