# Instrukcja wdrożenia aplikacji

## Wdrożenie na Heroku

### Wymagania wstępne
1. Konto na [Heroku](https://www.heroku.com)
2. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) zainstalowane na komputerze
3. Git zainstalowany na komputerze

### Krok po kroku

1. **Logowanie do Heroku**
   ```bash
   heroku login
   ```

2. **Utwórz aplikację Heroku**
   ```bash
   heroku create moja-aplikacja-randkowa
   ```

3. **Skonfiguruj zmienne środowiskowe**
   ```bash
   heroku config:set JWT_SECRET=twój_bezpieczny_sekret_jwt
   heroku config:set NODE_ENV=production
   ```

4. **Dodaj bazę danych MongoDB**
   ```bash
   heroku addons:create mongodb
   ```
   Alternatywnie, możesz użyć MongoDB Atlas i dodać odpowiedni URI:
   ```bash
   heroku config:set MONGODB_URI=mongodb+srv://użytkownik:hasło@twój-cluster.mongodb.net/tinder-clone
   heroku config:set MONGODB_DB=tinder-clone
   ```

5. **Wdrożenie aplikacji**
   ```bash
   git add .
   git commit -m "Przygotowanie do wdrożenia"
   git push heroku main
   ```

6. **Otwórz aplikację**
   ```bash
   heroku open
   ```

## Wdrożenie na własnym serwerze (VPS)

### Wymagania wstępne
1. Serwer z systemem Linux (np. Ubuntu)
2. Node.js zainstalowany na serwerze
3. MongoDB zainstalowany na serwerze lub zewnętrzny dostęp do bazy
4. PM2 do zarządzania procesami Node.js

### Krok po kroku

1. **Połącz się z serwerem**
   ```bash
   ssh użytkownik@adres-serwera
   ```

2. **Sklonuj repozytorium**
   ```bash
   git clone https://github.com/twoje-repozytorium/tinder-clone.git
   cd tinder-clone
   ```

3. **Zainstaluj zależności**
   ```bash
   npm install --production
   ```

4. **Utwórz plik .env**
   ```bash
   nano .env
   ```
   Dodaj następujące zmienne:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/tinder-clone
   JWT_SECRET=twój-tajny-klucz-jwt
   NODE_ENV=production
   ```

5. **Zainstaluj i skonfiguruj PM2**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "tinder-clone"
   pm2 save
   pm2 startup
   ```

6. **Skonfiguruj reverse proxy (Nginx)**
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/tinder-clone
   ```
   Dodaj konfigurację:
   ```
   server {
       listen 80;
       server_name twoja-domena.pl;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Włącz konfigurację Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/tinder-clone /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Skonfiguruj SSL (opcjonalnie)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d twoja-domena.pl
   ```

## Monitorowanie i aktualizacje

### Monitorowanie
- Użyj `pm2 monit` do monitorowania aplikacji na serwerze
- Skonfiguruj powiadomienia o błędach (np. przez Sentry.io)

### Aktualizacje
1. Pobierz najnowsze zmiany: `git pull origin main`
2. Zainstaluj zależności: `npm install --production`
3. Zrestartuj aplikację: `pm2 restart tinder-clone`

curl https://cli-assets.heroku.com/install.sh | sh 