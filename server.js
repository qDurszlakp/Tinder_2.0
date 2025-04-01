// Ładowanie zmiennych środowiskowych
try {
  require('dotenv').config();
} catch (e) {
  console.log('Ostrzeżenie: moduł dotenv nie jest zainstalowany, używamy domyślnych wartości');
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./src/config/database');
const profileRoutes = require('./src/routes/profileRoutes');
const interactionRoutes = require('./src/routes/interactionRoutes');
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Dodajemy CORS dla requestów z frontendu
app.use(bodyParser.json());

// Serwowanie plików statycznych (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Routing - WAŻNE: trasy uwierzytelniania (authRoutes) muszą być przed trasami wymagającymi uwierzytelnienia
app.use(authRoutes); // Najpierw trasy uwierzytelniania (login, register)
app.use(profileRoutes);
app.use(interactionRoutes);
app.use(chatRoutes);

// Dodajemy endpoint dla głównej strony
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Funkcja uruchamiająca serwer
async function startServer() {
  try {
    // Najpierw połącz z bazą danych
    await connectDB();
    
    // Uruchom serwer Express
    const server = app.listen(PORT, () => {
      console.log(`Serwer Tinder-Clone nasłuchuje na porcie ${PORT}`);
    });

    // Socket.IO dla czatu w czasie rzeczywistym
    const io = require('socket.io')(server);
    const Message = require('./src/models/Message');
    const Match = require('./src/models/Match');

    // Mapa przechowująca aktywne połączenia (profileId -> socketId)
    const activeConnections = new Map();

    io.on('connection', (socket) => {
      console.log('Nowe połączenie socket.io:', socket.id);
      
      // Użytkownik dołącza do swojego kanału
      socket.on('join', async (data) => {
        const { profileId, token } = data;
        
        // TODO: Weryfikacja tokenu dla lepszego zabezpieczenia
        
        // Przypisanie socketId do profileId
        activeConnections.set(profileId, socket.id);
        
        console.log(`Profil ${profileId} połączony, socket: ${socket.id}`);
        
        // Powiadom klienta o udanym połączeniu
        socket.emit('joined', { profileId });
      });
      
      // Obsługa wysyłania wiadomości
      socket.on('sendMessage', async (data) => {
        const { senderId, receiverId, content } = data;
        
        try {
          // Sprawdzenie, czy istnieje dopasowanie między użytkownikami
          const isMatch = await Match.exists(senderId, receiverId);
          
          if (!isMatch) {
            socket.emit('error', { message: 'Brak dopasowania między profilami' });
            return;
          }
          
          // Zapisanie wiadomości w bazie
          const message = new Message(senderId, receiverId, content);
          const savedMessage = await message.save();
          
          // Emisja do nadawcy potwierdzenia
          socket.emit('messageSent', savedMessage);
          
          // Sprawdzenie, czy odbiorca jest online
          const receiverSocketId = activeConnections.get(receiverId);
          
          if (receiverSocketId) {
            // Emisja do odbiorcy
            io.to(receiverSocketId).emit('newMessage', savedMessage);
          }
          
        } catch (error) {
          console.error('Błąd podczas wysyłania wiadomości:', error);
          socket.emit('error', { message: 'Wystąpił błąd podczas wysyłania wiadomości' });
        }
      });
      
      // Obsługa oznaczania wiadomości jako przeczytane
      socket.on('markAsRead', async (data) => {
        const { profileId, otherProfileId } = data;
        
        try {
          // Oznaczenie wiadomości jako przeczytane
          await Message.markConversationAsRead(otherProfileId, profileId);
          
          // Emisja do nadawcy potwierdzenia
          socket.emit('messagesRead', { profileId, otherProfileId });
          
          // Sprawdzenie, czy druga osoba jest online
          const otherSocketId = activeConnections.get(otherProfileId);
          
          if (otherSocketId) {
            // Emisja do drugiej osoby informacji o przeczytaniu wiadomości
            io.to(otherSocketId).emit('messagesRead', { profileId, otherProfileId });
          }
          
        } catch (error) {
          console.error('Błąd podczas oznaczania wiadomości jako przeczytane:', error);
          socket.emit('error', { message: 'Wystąpił błąd podczas oznaczania wiadomości jako przeczytane' });
        }
      });
      
      // Obsługa rozłączenia
      socket.on('disconnect', () => {
        console.log('Rozłączono socket:', socket.id);
        
        // Usunięcie z mapy aktywnych połączeń
        for (const [profileId, socketId] of activeConnections.entries()) {
          if (socketId === socket.id) {
            activeConnections.delete(profileId);
            console.log(`Profil ${profileId} rozłączony`);
            break;
          }
        }
      });
    });
  } catch (err) {
    console.error('Błąd podczas uruchamiania serwera:', err);
    process.exit(1);
  }
}

// Uruchom serwer tylko jeśli jest to główny moduł
if (require.main === module) {
  startServer();
}

// Eksportuj app, aby testy mogły z niego korzystać
module.exports = app; 