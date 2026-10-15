const { getCollection } = require('../db');
const { encryptToken, decryptToken } = require('../lib/cryptoTokens');

function getCalendarTokensCollection() {
  return getCollection('calendar_tokens');
}

function hasCalendarScope(scope) {
  if (!scope || typeof scope !== 'string') return false;
  return scope.split(' ').includes('https://www.googleapis.com/auth/calendar.events');
}

async function upsertCalendarTokens({ google_id, access_token, refresh_token, expira_en, scope }) {
  const collection = getCalendarTokensCollection();
  const existing = await collection.findOne({ google_id });
  const refreshToStore = refresh_token
    ? encryptToken(refresh_token)
    : (existing && existing.refresh_token ? existing.refresh_token : null);

  const doc = {
    google_id,
    access_token: encryptToken(access_token),
    refresh_token: refreshToStore,
    expira_en,
    scope: scope || '',
    actualizado_en: new Date().toISOString(),
  };

  await collection.updateOne(
    { google_id },
    {
      $set: doc,
      $setOnInsert: {
        creado_en: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

async function getCalendarTokensByGoogleId(google_id) {
  const collection = getCalendarTokensCollection();
  const doc = await collection.findOne({ google_id });
  if (!doc) return null;

  return {
    google_id: doc.google_id,
    access_token: doc.access_token ? decryptToken(doc.access_token) : null,
    refresh_token: doc.refresh_token ? decryptToken(doc.refresh_token) : null,
    expira_en: doc.expira_en,
    scope: doc.scope || '',
  };
}

module.exports = {
  upsertCalendarTokens,
  getCalendarTokensByGoogleId,
  hasCalendarScope,
};
