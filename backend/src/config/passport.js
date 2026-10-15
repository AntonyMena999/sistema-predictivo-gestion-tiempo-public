// Configuración de Passport con Google OAuth2
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { buscarOCrearUsuario, buscarUsuarioPorGoogleId } = require('../models/usuario');
const { upsertCalendarTokens } = require('../models/calendarTokens');

// Cargar variables desde entorno
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, params, profile, done) => {
      try {
        // Extraer campos relevantes del perfil de Google
        const google_id = profile.id;
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        const nombre = profile.displayName;
        const foto_url = profile.photos && profile.photos[0] && profile.photos[0].value;

        // Buscar o crear usuario en la base de datos
        const usuario = await buscarOCrearUsuario({ google_id, email, nombre, foto_url });

        // Guardar tokens de Calendar para uso server-side en creacion de eventos por usuario.
        // Google puede no devolver refreshToken en todos los intercambios; preservamos el previo.
        const scope = params && typeof params.scope === 'string' ? params.scope : '';
        const expiresIn = params && Number(params.expires_in);
        const expira_en = Number.isFinite(expiresIn)
          ? Date.now() + expiresIn * 1000
          : Date.now() + 3600 * 1000;

        await upsertCalendarTokens({
          google_id,
          access_token: accessToken,
          refresh_token: refreshToken || null,
          expira_en,
          scope,
        });

        return done(null, usuario);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Para compatibilidad con sesiones (aunque usaremos JWT en el frontend)
passport.serializeUser((user, done) => {
  // Guardamos sólo el google_id en la sesión
  done(null, user && user.google_id ? user.google_id : null);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) return done(null, null);
    const user = await buscarUsuarioPorGoogleId(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Exportamos passport por si se necesita importarlo
module.exports = passport;
