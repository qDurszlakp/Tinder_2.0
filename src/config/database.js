const { MongoClient } = require('mongodb');

// Konfiguracja MongoDB
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'tinderCloneDb';
let db;

// Asynchroniczna funkcja do połączenia z MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log(`Połączono z bazą danych MongoDB: ${dbName}`);
    return db;
  } catch (err) {
    console.error('Nie można połączyć z MongoDB:', err);
    process.exit(1);
  }
}

module.exports = { connectDB, getDb: () => db }; 