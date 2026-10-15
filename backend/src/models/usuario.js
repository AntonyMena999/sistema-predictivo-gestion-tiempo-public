// Modelo simple para la colección `usuarios` usando el driver oficial de MongoDB
// Exporta funciones para buscar y crear usuarios siguiendo el patrón de `db.js`
const { getCollection } = require('../db');

// Buscar un usuario por su google_id. Devuelve el documento o null si no existe.
async function buscarUsuarioPorGoogleId(googleId) {
  const collection = getCollection('usuarios');
  const usuario = await collection.findOne({ google_id: googleId });
  return usuario || null;
}

// Crear un usuario nuevo. Añade `creado_en` en formato ISO y devuelve el documento creado.
async function crearUsuario({ google_id, email, nombre, foto_url }) {
  const collection = getCollection('usuarios');
  const nuevo = {
    google_id,
    email,
    nombre,
    foto_url,
    creado_en: new Date().toISOString(),
  };

  const result = await collection.insertOne(nuevo);
  if (result && result.insertedId) {
    return Object.assign({ _id: result.insertedId }, nuevo);
  }
  return null;
}

// Buscar un usuario por google_id; si no existe, lo crea y devuelve el documento.
async function buscarOCrearUsuario({ google_id, email, nombre, foto_url }) {
  const existente = await buscarUsuarioPorGoogleId(google_id);
  if (existente) return existente;
  return crearUsuario({ google_id, email, nombre, foto_url });
}

module.exports = {
  buscarUsuarioPorGoogleId,
  crearUsuario,
  buscarOCrearUsuario,
};
