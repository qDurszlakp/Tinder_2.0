const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

class Message {
  constructor(senderId, receiverId, content, timestamp = new Date()) {
    this.senderId = ObjectId.isValid(senderId) ? new ObjectId(senderId) : senderId;
    this.receiverId = ObjectId.isValid(receiverId) ? new ObjectId(receiverId) : receiverId;
    this.content = content;
    this.timestamp = timestamp;
    this.isRead = false;
  }

  /**
   * Zapisuje wiadomość w bazie danych
   * @returns {Promise<Object>} Zapisana wiadomość z ID
   */
  async save() {
    const db = getDb();
    const result = await db.collection('messages').insertOne(this);
    this._id = result.insertedId;
    return this;
  }

  /**
   * Pobiera wszystkie wiadomości dla danej konwersacji między dwoma profilami
   * @param {string} profileId1 - ID pierwszego profilu
   * @param {string} profileId2 - ID drugiego profilu
   * @returns {Promise<Array>} Lista wiadomości posortowana chronologicznie
   */
  static async getConversation(profileId1, profileId2) {
    const db = getDb();
    profileId1 = ObjectId.isValid(profileId1) ? new ObjectId(profileId1) : profileId1;
    profileId2 = ObjectId.isValid(profileId2) ? new ObjectId(profileId2) : profileId2;

    const messages = await db.collection('messages').find({
      $or: [
        { senderId: profileId1, receiverId: profileId2 },
        { senderId: profileId2, receiverId: profileId1 }
      ]
    }).sort({ timestamp: 1 }).toArray();

    return messages;
  }

  /**
   * Pobiera wszystkie konwersacje dla danego profilu
   * @param {string} profileId - ID profilu
   * @returns {Promise<Array>} Lista konwersacji z ostatnią wiadomością
   */
  static async getConversationsForProfile(profileId) {
    const db = getDb();
    profileId = ObjectId.isValid(profileId) ? new ObjectId(profileId) : profileId;

    // Pobierz wszystkie wiadomości, w których profil jest nadawcą lub odbiorcą
    const messages = await db.collection('messages').find({
      $or: [
        { senderId: profileId },
        { receiverId: profileId }
      ]
    }).sort({ timestamp: -1 }).toArray();

    // Grupuj wiadomości według konwersacji (z kim rozmawiał użytkownik)
    const conversations = {};
    
    for (let message of messages) {
      // Określamy ID drugiej osoby w konwersacji
      const otherId = message.senderId.equals(profileId) 
        ? message.receiverId.toString() 
        : message.senderId.toString();
      
      if (!conversations[otherId]) {
        // Jeśli nie mamy jeszcze tej konwersacji, dodajemy ją z pierwszą wiadomością
        conversations[otherId] = {
          profileId: otherId,
          lastMessage: {
            content: message.content,
            timestamp: message.timestamp,
            isRead: message.isRead,
            isFromMe: message.senderId.equals(profileId)
          },
          unreadCount: message.receiverId.equals(profileId) && !message.isRead ? 1 : 0
        };
      } else if (!message.isRead && message.receiverId.equals(profileId)) {
        // Zwiększamy licznik nieprzeczytanych wiadomości
        conversations[otherId].unreadCount++;
      }
    }

    // Pobierz dane profili dla każdej konwersacji
    const result = [];
    for (let profileId in conversations) {
      const profile = await db.collection('profiles').findOne({ _id: new ObjectId(profileId) });
      if (profile) {
        result.push({
          ...conversations[profileId],
          profile: {
            _id: profile._id,
            name: profile.name,
            photoUrl: profile.photoUrl
          }
        });
      }
    }

    // Sortuj według ostatniej wiadomości (najnowsze na górze)
    return result.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  }

  /**
   * Oznacza wszystkie wiadomości w konwersacji jako przeczytane
   * @param {string} fromProfileId - ID profilu nadawcy
   * @param {string} toProfileId - ID profilu odbiorcy
   * @returns {Promise<Object>} Wynik operacji
   */
  static async markConversationAsRead(fromProfileId, toProfileId) {
    const db = getDb();
    fromProfileId = ObjectId.isValid(fromProfileId) ? new ObjectId(fromProfileId) : fromProfileId;
    toProfileId = ObjectId.isValid(toProfileId) ? new ObjectId(toProfileId) : toProfileId;

    const result = await db.collection('messages').updateMany(
      { senderId: fromProfileId, receiverId: toProfileId, isRead: false },
      { $set: { isRead: true } }
    );

    return result;
  }
}

module.exports = Message; 