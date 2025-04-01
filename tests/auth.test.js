const request = require('supertest');
const dbHandler = require('./db-handler');
const app = require('../server');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

// Dane testowe
const testUser = {
  email: 'test@example.com',
  password: 'testpassword'
};

// Konfiguracja przed wszystkimi testami
beforeAll(async () => {
  await dbHandler.connect();
});

// Czyszczenie bazy po każdym teście
afterEach(async () => {
  await dbHandler.clearDatabase();
});

// Zamknięcie bazy po wszystkich testach
afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe('Uwierzytelnianie użytkowników', () => {
  
  // Test rejestracji użytkownika
  test('Powinien zarejestrować nowego użytkownika', async () => {
    const response = await request(app)
      .post('/register')
      .send(testUser)
      .expect(201);
    
    expect(response.body.message).toBe('Konto zostało utworzone pomyślnie');
    expect(response.body.token).toBeDefined();
    expect(response.body.userId).toBeDefined();
    
    // Sprawdzenie, czy użytkownik faktycznie został zapisany w bazie
    const savedUser = await User.findByEmail(testUser.email);
    
    expect(savedUser).toBeDefined();
    expect(savedUser.email).toBe(testUser.email);
    expect(savedUser.password).toBeDefined();
    expect(savedUser.password.hash).toBeDefined();
    expect(savedUser.password.salt).toBeDefined();
  });
  
  // Test logowania użytkownika
  test('Powinien zalogować użytkownika i zwrócić token', async () => {
    // Najpierw rejestrujemy użytkownika
    await request(app)
      .post('/register')
      .send(testUser);
    
    // Teraz próbujemy się zalogować
    const loginResponse = await request(app)
      .post('/login')
      .send(testUser)
      .expect(200);
    
    expect(loginResponse.body.message).toBe('Zalogowano pomyślnie');
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.userId).toBeDefined();
  });
  
  // Test weryfikacji tokenu
  test('Powinien zweryfikować poprawny token', async () => {
    // Najpierw rejestrujemy użytkownika
    const registerResponse = await request(app)
      .post('/register')
      .send(testUser);
    
    const token = registerResponse.body.token;
    
    // Teraz weryfikujemy token
    const verifyResponse = await request(app)
      .get('/verify-token')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(verifyResponse.body.userId).toBeDefined();
    expect(verifyResponse.body.email).toBe(testUser.email);
  });
  
  // Test nieudanej rejestracji (email już istnieje)
  test('Powinien odrzucić rejestrację z istniejącym emailem', async () => {
    // Najpierw rejestrujemy użytkownika
    await request(app)
      .post('/register')
      .send(testUser);
    
    // Próbujemy zarejestrować się ponownie z tym samym emailem
    const response = await request(app)
      .post('/register')
      .send(testUser)
      .expect(400);
    
    expect(response.body.message).toBe('Użytkownik o podanym adresie email już istnieje');
  });
  
  // Test nieudanego logowania (nieprawidłowe hasło)
  test('Powinien odrzucić logowanie z nieprawidłowym hasłem', async () => {
    // Najpierw rejestrujemy użytkownika
    await request(app)
      .post('/register')
      .send(testUser);
    
    // Próbujemy zalogować się z nieprawidłowym hasłem
    const response = await request(app)
      .post('/login')
      .send({
        email: testUser.email,
        password: 'nieprawidłowehasło'
      })
      .expect(401);
    
    expect(response.body.message).toBe('Nieprawidłowy email lub hasło');
  });
  
  // Test powiązania profilu z użytkownikiem
  test('Powinien powiązać profil z użytkownikiem', async () => {
    // Najpierw rejestrujemy użytkownika
    const registerResponse = await request(app)
      .post('/register')
      .send(testUser);
    
    const userId = registerResponse.body.userId;
    const token = registerResponse.body.token;
    
    // Tworzymy profil i symulujemy jego ID
    const mockProfileId = '507f1f77bcf86cd799439011'; // przykładowe ID MongoDB
    
    // Łączymy profil z użytkownikiem
    const linkResponse = await request(app)
      .post('/link-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: userId,
        profileId: mockProfileId
      })
      .expect(200);
    
    expect(linkResponse.body.message).toBe('Profil został powiązany z kontem użytkownika');
    
    // Sprawdzamy, czy powiązanie zostało zapisane w bazie
    const updatedUser = await User.findById(userId);
    expect(updatedUser.profileId).toBeDefined();
    expect(updatedUser.profileId.toString()).toBe(mockProfileId);
  });
}); 