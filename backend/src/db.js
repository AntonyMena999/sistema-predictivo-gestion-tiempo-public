// Conexión sencilla a MongoDB usando el driver oficial
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;
let client;
let database;

function extractDbName(uriStr) {
  // Extrae el nombre de la base de datos desde la URI (última parte después de '/').
  // Maneja query params si existen.
  try {
    const idx = uriStr.lastIndexOf('/');
    if (idx === -1) return null;
    return uriStr.substring(idx + 1).split('?')[0];
  } catch (e) {
    return null;
  }
}

async function connectToMongo() {
  if (!uri) throw new Error('MONGO_URI no está definido en .env');
  client = new MongoClient(uri);
  await client.connect();
  const dbName = extractDbName(uri);
  if (!dbName) throw new Error('No se pudo determinar el nombre de la base de datos desde MONGO_URI');
  database = client.db(dbName);
  console.log(`Conectado a MongoDB: ${dbName}`);
}

function getCollection(name) {
  if (!database) throw new Error('La conexión a la base de datos no está inicializada');
  return database.collection(name);
}

module.exports = { connectToMongo, getCollection };
