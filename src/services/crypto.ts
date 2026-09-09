// Web Crypto API implementation for AES-GCM 256-bit local database encryption
const CHECK_SENTINEL = 'SNT_MEZHDURECHYE_VAULT_ENCRYPTED_CHECK_V1';

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM 256-bit key from PIN or Password using PBKDF2
export async function deriveKey(pin: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt string with AES-GCM
export async function encryptData(data: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const enc = new TextEncoder();
  const encoded = enc.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  return {
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encrypted),
  };
}

// Decrypt string with AES-GCM
export async function decryptData(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    ciphertext
  );

  return dec.decode(decrypted);
}

// Create a new encrypted package from payload object
export async function createEncryptedVault(
  payloadObj: unknown,
  pin: string
): Promise<{
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  checkCiphertext: string;
  checkIv: string;
  timestamp: number;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt.buffer);

  const json = JSON.stringify(payloadObj);
  const { iv, ciphertext } = await encryptData(json, key);

  // Also encrypt the check sentinel for rapid PIN verification
  const check = await encryptData(CHECK_SENTINEL, key);

  return {
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv,
    ciphertext,
    checkCiphertext: check.ciphertext,
    checkIv: check.iv,
    timestamp: Date.now(),
  };
}

// Verify PIN and decrypt vault
export async function verifyAndDecryptVault(
  encryptedPackage: {
    salt: string;
    iv: string;
    ciphertext: string;
    checkCiphertext?: string;
    checkIv?: string;
  },
  pin: string
): Promise<{ success: boolean; data?: any; key?: CryptoKey; error?: string }> {
  try {
    const salt = base64ToBuffer(encryptedPackage.salt);
    const key = await deriveKey(pin, salt);

    // If check sentinel exists, test it first
    if (encryptedPackage.checkCiphertext && encryptedPackage.checkIv) {
      try {
        const decryptedCheck = await decryptData(
          encryptedPackage.checkCiphertext,
          encryptedPackage.checkIv,
          key
        );
        if (decryptedCheck !== CHECK_SENTINEL) {
          return { success: false, error: 'Неверный PIN-код или пароль' };
        }
      } catch {
        return { success: false, error: 'Неверный PIN-код или пароль' };
      }
    }

    const decryptedJson = await decryptData(encryptedPackage.ciphertext, encryptedPackage.iv, key);
    const data = JSON.parse(decryptedJson);
    return { success: true, data, key };
  } catch (err: any) {
    return {
      success: false,
      error: 'Не удалось расшифровать данные. Проверьте правильность PIN-кода.',
    };
  }
}

// Hash string for display (key fingerprint)
export async function computeFingerprint(pin: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const input = `${pin}-${saltBase64}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(input));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8).toUpperCase();
}
