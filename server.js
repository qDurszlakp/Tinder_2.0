const express = require('express');
const bodyParser = require('body-parser');
const { connectDB } = require('./src/config/database');
const profileRoutes = require('./src/routes/profileRoutes');
const interactionRoutes = require('./src/routes/interactionRoutes');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Routing
app.use(profileRoutes);
app.use(interactionRoutes);

// Funkcja uruchamiająca serwer
async function startServer() {
  try {
    // Najpierw połącz z bazą danych
    await connectDB();
    
    // Uruchom serwer Express
    app.listen(port, () => {
      console.log(`Serwer Tinder-Clone nasłuchuje na porcie ${port}`);
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