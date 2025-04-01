const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const crypto = require('crypto');

class User {
  constructor(email, password) {
    this.email = email;
    // Hashowanie hasła przed zapisaniem
    this.password = this.hashPassword(password);
    this.createdAt = new Date();
    this.profileId = null;
  }

  // Hashowanie hasła
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  // Sprawdzanie hasła
  static verifyPassword(password, storedSalt, storedHash) {
    const hash = crypto.pbkdf2Sync(password, storedSalt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
  }

  // Zapisanie użytkownika do bazy danych
  async save() {
    const db = getDb();
    const usersCollection = db.collection('users');
    const result = await usersCollection.insertOne(this);
    return result;
  }

  // Połączenie profilu z użytkownikiem
  static async linkProfile(userId, profileId) {
    const db = getDb();
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profileId: new ObjectId(profileId) } }
    );
  }

  // Znajdź użytkownika po email
  static async findByEmail(email) {
    const db = getDb();
    const usersCollection = db.collection('users');
    return await usersCollection.findOne({ email });
  }

  // Znajdź użytkownika po ID
  static async findById(userId) {
    const db = getDb();
    const usersCollection = db.collection('users');
    return await usersCollection.findOne({ _id: new ObjectId(userId) });
  }

  // Znajdź użytkownika powiązanego z profilem
  static async findByProfileId(profileId) {
    const db = getDb();
    const usersCollection = db.collection('users');
    return await usersCollection.findOne({ profileId: new ObjectId(profileId) });
  }
}

module.exports = User; 