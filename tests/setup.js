// Ustawienie timeoutu dla testów
jest.setTimeout(30000);

// Import modułu dbHandler
const dbHandler = require('./db-handler');

// Połącz z bazą danych przed uruchomieniem testów
beforeAll(async () => {
  await dbHandler.connect();
});

// Wyczyść bazę danych po każdym teście
afterEach(async () => {
  await dbHandler.clearDatabase();
  // Czyszczenie mocków po każdym teście
  jest.clearAllMocks();
});

// Zamknij połączenie z bazą danych po zakończeniu wszystkich testów
afterAll(async () => {
  await dbHandler.closeDatabase();
}); 