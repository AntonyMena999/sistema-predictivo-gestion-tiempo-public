const { google } = require('googleapis');

const {
  getCalendarTokensByGoogleId,
  upsertCalendarTokens,
  hasCalendarScope,
} = require('../models/calendarTokens');

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
}

async function refreshAccessTokenIfNeeded(tokenData) {
  const now = Date.now();
  if (tokenData.expira_en && tokenData.expira_en > now + 30 * 1000) {
    return tokenData;
  }

  if (!tokenData.refresh_token) {
    console.error('Calendar refresh token ausente', { google_id: tokenData.google_id });
    const err = new Error('Token de Calendar sin refresh_token');
    err.code = 'CALENDAR_TOKEN_INVALID';
    throw err;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ refresh_token: tokenData.refresh_token });

  let refreshed;
  try {
    refreshed = await oauth2Client.getAccessToken();
  } catch (e) {
    console.error('Google Calendar refresh error:', {
      google_id: tokenData.google_id,
      message: e?.message,
      status: e?.response?.status,
      data: e?.response?.data,
    });
    const err = new Error('No se pudo refrescar el token de Calendar');
    err.code = 'CALENDAR_TOKEN_INVALID';
    throw err;
  }

  const credentials = oauth2Client.credentials || {};
  const nextAccessToken = credentials.access_token || (refreshed && refreshed.token ? refreshed.token : null);
  const nextExpiry = typeof credentials.expiry_date === 'number' ? credentials.expiry_date : now + 3600 * 1000;

  if (!nextAccessToken) {
    console.error('Google Calendar refresh sin access_token', { google_id: tokenData.google_id });
    const err = new Error('Refresh sin access_token');
    err.code = 'CALENDAR_TOKEN_INVALID';
    throw err;
  }

  await upsertCalendarTokens({
    google_id: tokenData.google_id,
    access_token: nextAccessToken,
    refresh_token: tokenData.refresh_token,
    expira_en: nextExpiry,
    scope: tokenData.scope || CALENDAR_SCOPE,
  });

  return {
    ...tokenData,
    access_token: nextAccessToken,
    expira_en: nextExpiry,
  };
}

async function getAuthorizedTokenForGoogleId(google_id) {
  const tokenData = await getCalendarTokensByGoogleId(google_id);
  if (!tokenData || !tokenData.access_token || !hasCalendarScope(tokenData.scope)) {
    console.error('Token Calendar inexistente o sin scope', { google_id });
    const err = new Error('Token de Calendar inexistente o sin scope calendar.events');
    err.code = 'CALENDAR_TOKEN_MISSING_OR_SCOPE';
    throw err;
  }

  return refreshAccessTokenIfNeeded(tokenData);
}

async function createCalendarEvent({ google_id, titulo, start, end }) {
  const tokenData = await getAuthorizedTokenForGoogleId(google_id);

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || undefined,
    expiry_date: tokenData.expira_en,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: titulo,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });

    return response.data;
  } catch (e) {
    console.error('Google Calendar insert error:', {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    const err = new Error('No se pudo crear el evento en Google Calendar');
    err.code = 'GOOGLE_CALENDAR_ERROR';
    throw err;
  }
}

async function listCalendarEvents({ google_id, timeMin, timeMax }) {
  const tokenData = await getAuthorizedTokenForGoogleId(google_id);

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || undefined,
    expiry_date: tokenData.expira_en,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'America/Guayaquil',
    });

    return response.data.items || [];
  } catch (e) {
    console.error('Google Calendar list error:', {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    const err = new Error('No se pudo leer eventos de Google Calendar');
    err.code = 'GOOGLE_CALENDAR_ERROR';
    throw err;
  }
}

async function updateCalendarEvent({ google_id, eventId, titulo }) {
  const tokenData = await getAuthorizedTokenForGoogleId(google_id);

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || undefined,
    expiry_date: tokenData.expira_en,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: titulo,
      },
    });

    return response.data;
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404) {
      const err = new Error('Evento no encontrado en Google Calendar');
      err.code = 'GOOGLE_CALENDAR_NOT_FOUND';
      throw err;
    }

    console.error('Google Calendar patch error:', {
      status,
      data: e?.response?.data,
      message: e?.message,
    });
    const err = new Error('No se pudo actualizar el evento en Google Calendar');
    err.code = 'GOOGLE_CALENDAR_ERROR';
    throw err;
  }
}

async function deleteCalendarEvent({ google_id, eventId }) {
  const tokenData = await getAuthorizedTokenForGoogleId(google_id);

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || undefined,
    expiry_date: tokenData.expira_en,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    return { ok: true };
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404) {
      const err = new Error('Evento no encontrado en Google Calendar');
      err.code = 'GOOGLE_CALENDAR_NOT_FOUND';
      throw err;
    }

    console.error('Google Calendar delete error:', {
      status,
      data: e?.response?.data,
      message: e?.message,
    });
    const err = new Error('No se pudo eliminar el evento en Google Calendar');
    err.code = 'GOOGLE_CALENDAR_ERROR';
    throw err;
  }
}

module.exports = {
  CALENDAR_SCOPE,
  createCalendarEvent,
  listCalendarEvents,
  getAuthorizedTokenForGoogleId,
  updateCalendarEvent,
  deleteCalendarEvent,
};
