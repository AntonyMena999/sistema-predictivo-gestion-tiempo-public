const crypto = require('crypto');

const KEY_ENV = 'CALENDAR_TOKEN_KEY_BASE64';

function getKey() {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`${KEY_ENV} no esta configurada`);
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} debe ser una clave base64 de 32 bytes`);
  }

  return key;
}

function encryptToken(plainText) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new Error('Token invalido para cifrar');
  }

  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Formato: iv:tag:ciphertext (base64) para persistencia compacta en Mongo.
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptToken(payload) {
  if (typeof payload !== 'string') {
    throw new Error('Payload cifrado invalido');
  }

  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato cifrado invalido');
  }

  const [ivB64, tagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(cipherB64, 'base64');

  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  encryptToken,
  decryptToken,
};
