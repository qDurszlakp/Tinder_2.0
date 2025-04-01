const { MongoClient } = require('mongodb');

// Konfiguracja MongoDB - używamy zmiennych środowiskowych
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'tinderCloneDb';
let db;

// Asynchroniczna funkcja do połączenia z MongoDB
async function connectDB() {
  try {
    // Opcje połączenia dla rozwiązania problemów z TLS
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      tls: true,
      tlsInsecure: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true
    };

    const client = new MongoClient(mongoUrl, options);
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