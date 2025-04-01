# Tinder Clone API

Ten projekt implementuje prosty backend aplikacji randkowej typu Tinder w Node.js przy użyciu frameworka Express i bazy danych MongoDB. Aplikacja umożliwia:

- Tworzenie profili użytkowników z informacjami takimi jak imię, wiek, płeć i zainteresowania
- Przeglądanie innych profili
- Wyrażanie zainteresowania (like) lub odrzucanie (dislike) profili
- Wykrywanie dopasowań (match), gdy dwoje użytkowników wzajemnie wyrazi zainteresowanie
- Przeglądanie historii dopasowań

## Struktura projektu

```
.
├── server.js          # Główny plik serwera (punkt wejściowy)
├── package.json       # Zależności projektu
├── .gitignore         # Ignorowane pliki i katalogi
└── src/               # Katalog z kodem źródłowym
    ├── config/        # Konfiguracja (bazy danych itp.)
    ├── controllers/   # Kontrolery obsługujące żądania 
    ├── models/        # Modele danych
    ├── routes/        # Definicje endpointów API
    ├── middlewares/   # Funkcje middleware
    └── utils/         # Funkcje pomocnicze
```

## Wymagania

- Node.js (wersja 14 lub nowsza)
- npm (zazwyczaj instalowany razem z Node.js)
- Uruchomiona instancja MongoDB (lokalnie na `mongodb://localhost:27017` lub skonfigurowana inaczej w `src/config/database.js`)

## Instalacja

1. Sklonuj repozytorium lub pobierz pliki projektu.
2. Przejdź do katalogu projektu w terminalu.
3. Zainstaluj zależności:
   ```bash
   npm install
   ```

## Uruchomienie

**Upewnij się, że Twoja instancja MongoDB jest uruchomiona.**

Aby uruchomić serwer, wykonaj polecenie:

```bash
npm start
```

Serwer połączy się z bazą danych MongoDB i będzie nasłuchiwał na porcie 3000.

## Endpoints API

### Zarządzanie profilem

- `POST /profile`: Tworzy nowy profil użytkownika.
  - Wymagane ciało żądania (JSON): `{ "name": "Jan", "age": 25, "gender": "M", "bio": "Opis", "interests": ["sport", "muzyka"], "photoUrl": "url_do_zdjęcia" }`
  - Tylko pola `name`, `age` i `gender` są obowiązkowe.

- `GET /profile/:profileId`: Pobiera szczegóły profilu o podanym ID.

### Przeglądanie i interakcje

- `GET /profiles/:profileId`: Pobiera listę profili do przeglądania.
  - Parametry zapytania (opcjonalne): `gender` (płeć), `minAge` (minimalny wiek), `maxAge` (maksymalny wiek), `limit` (ilość profili, domyślnie 10)
  - Zwraca listę profili, które nie były jeszcze lubiane ani odrzucone przez użytkownika.

- `POST /like`: Wyraża zainteresowanie profilem.
  - Wymagane ciało żądania (JSON): `{ "profileId": "id_twojego_profilu", "likedProfileId": "id_lubianego_profilu" }`
  - Zwraca informację, czy nastąpiło dopasowanie (match).

- `POST /dislike`: Odrzuca profil.
  - Wymagane ciało żądania (JSON): `{ "profileId": "id_twojego_profilu", "dislikedProfileId": "id_odrzucanego_profilu" }`

- `GET /matches/:profileId`: Pobiera listę dopasowań (matches) dla profilu o podanym ID.
  - Zwraca listę profili, z którymi nastąpiło wzajemne dopasowanie.

## Uwagi

- Aplikacja nie zawiera mechanizmu autoryzacji/uwierzytelniania - jest to prosta wersja demonstracyjna.
- W prawdziwej aplikacji produkcyjnej należałoby dodać mechanizm uwierzytelniania oraz zabezpieczyć wrażliwe dane.
- Zaleca się dodanie walidacji danych wejściowych oraz obsługi błędów dla zwiększenia niezawodności. 