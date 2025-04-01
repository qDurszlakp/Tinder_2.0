const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// Mockowanie modułu bazy danych
jest.mock('../src/config/database');
const databaseConfig = require('../src/config/database');

let mongoServer;
let connection;
let db;

/**
 * Łączy z bazą danych w pamięci
 */
const connect = async () => {
  // Używamy jednego serwera MongoDB dla wszystkich testów
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  
  const uri = mongoServer.getUri();
  
  if (!connection) {
    connection = await MongoClient.connect(uri);
    db = connection.db('jest-tinderCloneDb');
  }

  // Mockujemy funkcje z modułu database.js
  databaseConfig.connectDB.mockResolvedValue(db);
  databaseConfig.getDb.mockReturnValue(db);
  
  return db;
};

/**
 * Rozłącza i zamyka bazę danych
 */
const closeDatabase = async () => {
  if (connection) {
    await connection.close();
    connection = null;
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

/**
 * Czyści wszystkie kolekcje w bazie
 */
const clearDatabase = async () => {
  if (db) {
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
};

module.exports = {
  connect,
  closeDatabase,
  clearDatabase
}; 