// Servidor principal Express
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { connectToMongo } = require('./db');
const eventosRouter = require('./routes/eventos');

// Cargar variables de entorno
dotenv.config();

// Importar configuración de passport (ejecuta la configuración)
require('./config/passport');
const requireAuth = require('./middleware/auth');

const app = express();

// Middlewares básicos
app.use(cors()); // Permitir CORS para que el frontend en otro puerto pueda consumir la API
app.use(express.json());

// Configurar sesiones, cookies y passport (orden: session -> cookieParser -> passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rutas de autenticación
app.use('/auth', require('./routes/auth'));
app.use('/calendar', require('./routes/calendar'));

// Rutas de eventos y chat protegidas por JWT (middleware requireAuth)
app.use('/eventos', requireAuth, eventosRouter);
app.use('/chat', requireAuth, require('./routes/chat'));
app.use('/chats', requireAuth, require('./routes/chats'));
app.use('/predicciones', requireAuth, require('./routes/predicciones'));

// Middleware de manejo de errores genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;

// Conectar a Mongo y arrancar servidor
connectToMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err);
    process.exit(1);
  });
