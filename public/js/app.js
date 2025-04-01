// Globalne zmienne
let currentUserId = null;
let currentProfileId = null;
let currentSwipeProfiles = [];
let currentSwipeIndex = 0;
let authToken = null;
let socket = null;
let currentChatProfileId = null;

// API URL - backend działa na porcie 3000
const API_URL = 'http://localhost:3000';

// Elementy DOM - ekrany
const authScreen = document.getElementById('auth-screen');
const profileScreen = document.getElementById('profile-screen');
const swipeScreen = document.getElementById('swipe-screen');
const matchesScreen = document.getElementById('matches-screen');
const chatScreen = document.getElementById('chat-screen');

// Elementy DOM - przyciski nawigacji
const profileBtn = document.getElementById('profile-btn');
const swipeBtn = document.getElementById('swipe-btn');
const matchesBtn = document.getElementById('matches-btn');
const logoutBtn = document.getElementById('logout-btn');
const mainNav = document.getElementById('main-nav');

// Elementy DOM - logowanie i rejestracja
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Elementy DOM - pozostałe
const profileForm = document.getElementById('profile-form');
const cardsContainer = document.getElementById('cards-container');
const matchesList = document.getElementById('matches-list');

const likeBtn = document.getElementById('like-btn');
const dislikeBtn = document.getElementById('dislike-btn');

const matchModal = document.getElementById('match-modal');
const matchProfileInfo = document.getElementById('match-profile-info');
const closeMatchModalBtn = document.getElementById('close-match-modal');
const startChatModalBtn = document.getElementById('start-chat-modal');

// Elementy DOM - czat
const chatWithName = document.getElementById('chat-with-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const backToMatchesBtn = document.getElementById('back-to-matches-btn');

// Event Listenery
document.addEventListener('DOMContentLoaded', init);

// Nawigacja
profileBtn.addEventListener('click', () => switchScreen('profile'));
swipeBtn.addEventListener('click', () => switchScreen('swipe'));
matchesBtn.addEventListener('click', () => switchScreen('matches'));
logoutBtn.addEventListener('click', handleLogout);

// Logowanie/Rejestracja
loginTab.addEventListener('click', () => switchAuthTab('login'));
registerTab.addEventListener('click', () => switchAuthTab('register'));
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);

// Pozostałe
profileForm.addEventListener('submit', handleProfileSubmit);
likeBtn.addEventListener('click', () => handleSwipe('like'));
dislikeBtn.addEventListener('click', () => handleSwipe('dislike'));
closeMatchModalBtn.addEventListener('click', hideMatchModal);
startChatModalBtn.addEventListener('click', handleStartChatFromModal);

// Czat
chatForm.addEventListener('submit', handleSendMessage);
backToMatchesBtn.addEventListener('click', () => switchScreen('matches'));

// Inicjalizacja aplikacji
async function init() {
    // Sprawdź, czy użytkownik jest zalogowany (token w localStorage)
    authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        // Próba weryfikacji tokenu
        try {
            const response = await fetch(`${API_URL}/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                currentUserId = userData.userId;
                currentProfileId = userData.profileId;
                
                // Inicjalizacja Socket.IO, jeśli użytkownik ma profil
                if (currentProfileId) {
                    initializeSocket();
                    mainNav.style.display = 'flex';
                    await loadSwipeProfiles();
                    switchScreen('swipe');
                } else {
                    // Jeśli nie ma profilu, przejdź do ekranu tworzenia profilu
                    mainNav.style.display = 'flex';
                    switchScreen('profile');
                }
            } else {
                // Token nieprawidłowy - wyloguj użytkownika
                resetAuthState();
                showAuthScreen();
            }
        } catch (error) {
            console.error('Błąd weryfikacji tokenu:', error);
            resetAuthState();
            showAuthScreen();
        }
    } else {
        // Brak tokenu - pokaż ekran logowania
        showAuthScreen();
    }
}

// Inicjalizacja Socket.IO
function initializeSocket() {
    if (socket) {
        // Jeśli już mamy połączenie, rozłączamy je
        socket.disconnect();
    }
    
    // Nawiązywanie połączenia z serwerem Socket.IO
    socket = io(API_URL);
    
    // Nasłuchiwanie zdarzeń
    socket.on('connect', () => {
        console.log('Połączono z serwerem Socket.IO');
        
        // Dołączanie do kanału użytkownika
        socket.emit('join', {
            profileId: currentProfileId,
            token: authToken
        });
    });
    
    socket.on('joined', (data) => {
        console.log('Dołączono do kanału:', data.profileId);
    });
    
    socket.on('newMessage', (message) => {
        console.log('Nowa wiadomość:', message);
        
        // Jeśli jesteśmy w czacie z nadawcą, dodajemy wiadomość
        if (chatScreen.classList.contains('active') && currentChatProfileId === message.senderId) {
            addMessageToChat(message, false);
            markMessagesAsRead(message.senderId);
        } else {
            // Jeśli nie, dodajemy powiadomienie (badge) do listy dopasowań
            updateUnreadBadge(message.senderId);
        }
    });
    
    socket.on('messageSent', (message) => {
        console.log('Wiadomość wysłana:', message);
        
        // Dodajemy wiadomość do czatu
        if (chatScreen.classList.contains('active')) {
            addMessageToChat(message, true);
        }
    });
    
    socket.on('messagesRead', (data) => {
        console.log('Wiadomości przeczytane:', data);
        
        // Aktualizujemy oznaczenie o przeczytaniu wiadomości w UI
        const messages = document.querySelectorAll('.message.sent');
        messages.forEach(message => {
            message.classList.add('read');
        });
    });
    
    socket.on('error', (error) => {
        console.error('Błąd Socket.IO:', error);
        alert(error.message || 'Wystąpił błąd podczas komunikacji.');
    });
    
    socket.on('disconnect', () => {
        console.log('Rozłączono z serwerem Socket.IO');
    });
}

// Resetowanie stanu uwierzytelnienia
function resetAuthState() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUserId = null;
    currentProfileId = null;
    currentChatProfileId = null;
    mainNav.style.display = 'none';
    
    // Zamknij połączenie Socket.IO
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Wyświetlanie ekranu logowania
function showAuthScreen() {
    authScreen.classList.add('active');
    profileScreen.classList.remove('active');
    swipeScreen.classList.remove('active');
    matchesScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    mainNav.style.display = 'none';
}

// Przełączanie między zakładkami logowania i rejestracji
function switchAuthTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

// Obsługa logowania
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Zapisz token uwierzytelniający
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUserId = data.userId;
            currentProfileId = data.profileId;
            
            // Inicjalizacja Socket.IO, jeśli użytkownik ma profil
            if (currentProfileId) {
                initializeSocket();
            }
            
            // Pokaż nawigację
            mainNav.style.display = 'flex';
            
            // Przejdź do odpowiedniego ekranu
            if (currentProfileId) {
                await loadSwipeProfiles();
                switchScreen('swipe');
            } else {
                switchScreen('profile');
            }
        } else {
            alert(data.message || 'Błąd logowania');
        }
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        alert('Wystąpił błąd podczas komunikacji z serwerem.');
    }
}

// Obsługa rejestracji
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Walidacja hasła
    if (password !== confirmPassword) {
        alert('Hasła nie są identyczne');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Zapisz token uwierzytelniający
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUserId = data.userId;
            
            // Pokaż nawigację i przejdź do ekranu tworzenia profilu
            mainNav.style.display = 'flex';
            switchScreen('profile');
            
            alert('Konto zostało utworzone pomyślnie. Teraz utwórz swój profil.');
        } else {
            alert(data.message || 'Błąd rejestracji');
        }
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        alert('Wystąpił błąd podczas komunikacji z serwerem.');
    }
}

// Obsługa wylogowania
function handleLogout() {
    resetAuthState();
    showAuthScreen();
    
    // Resetuj formularze
    loginForm.reset();
    registerForm.reset();
    profileForm.reset();
    
    // Wyczyść dane
    currentSwipeProfiles = [];
    currentSwipeIndex = 0;
}

// Zmiana aktywnego ekranu
function switchScreen(screenName) {
    // Ukryj wszystkie ekrany
    authScreen.classList.remove('active');
    profileScreen.classList.remove('active');
    swipeScreen.classList.remove('active');
    matchesScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    
    // Usuń klasę aktywny z przycisków nawigacji
    profileBtn.classList.remove('active');
    swipeBtn.classList.remove('active');
    matchesBtn.classList.remove('active');
    
    // Pokaż wybrany ekran i ustaw aktywny przycisk
    switch (screenName) {
        case 'profile':
            profileScreen.classList.add('active');
            profileBtn.classList.add('active');
            loadProfileData();
            break;
        case 'swipe':
            swipeScreen.classList.add('active');
            swipeBtn.classList.add('active');
            if (currentProfileId && currentSwipeProfiles.length === 0) {
                loadSwipeProfiles();
            }
            break;
        case 'matches':
            matchesScreen.classList.add('active');
            matchesBtn.classList.add('active');
            if (currentProfileId) {
                loadMatches();
            }
            break;
        case 'chat':
            chatScreen.classList.add('active');
            matchesBtn.classList.add('active');
            break;
    }
}

// Obsługa formularza profilu
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    if (!authToken || !currentUserId) {
        alert('Musisz być zalogowany, aby utworzyć profil');
        return;
    }
    
    const formData = new FormData(profileForm);
    const profileData = {
        name: formData.get('name'),
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        bio: formData.get('bio'),
        interests: formData.get('interests').split(',').map(i => i.trim()).filter(i => i),
        photoUrl: formData.get('photoUrl') || 'https://via.placeholder.com/400x500?text=No+Photo'
    };
    
    try {
        if (currentProfileId) {
            // TODO: Implementacja edycji profilu (obecnie API nie obsługuje)
            alert('Edycja profilu nie jest obsługiwana w tej wersji');
        } else {
            // Tworzenie nowego profilu
            const response = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(profileData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Zapisz ID profilu
                currentProfileId = data.profileId;
                
                // Powiąż profil z kontem użytkownika
                await fetch(`${API_URL}/link-profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        userId: currentUserId,
                        profileId: currentProfileId
                    }),
                });
                
                // Inicjalizacja Socket.IO
                initializeSocket();
                
                // Przejdź do ekranu swipowania
                await loadSwipeProfiles();
                switchScreen('swipe');
            } else {
                alert(`Błąd: ${data.message}`);
            }
        }
    } catch (error) {
        console.error('Błąd podczas zapisywania profilu:', error);
        alert('Wystąpił błąd podczas komunikacji z serwerem.');
    }
}

// Ładowanie danych profilu
async function loadProfileData() {
    if (!currentProfileId || !authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/profile/${currentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const profileData = await response.json();
        
        if (response.ok) {
            // Wypełnij formularz danymi
            document.getElementById('name').value = profileData.name || '';
            document.getElementById('age').value = profileData.age || '';
            document.getElementById('gender').value = profileData.gender || '';
            document.getElementById('bio').value = profileData.bio || '';
            document.getElementById('interests').value = (profileData.interests || []).join(', ');
            document.getElementById('photoUrl').value = profileData.photoUrl || '';
        } else {
            console.error('Nie udało się pobrać danych profilu');
            alert('Wystąpił błąd podczas pobierania danych profilu');
        }
    } catch (error) {
        console.error('Błąd podczas pobierania danych profilu:', error);
        alert('Wystąpił błąd podczas komunikacji z serwerem.');
    }
}

// Ładowanie profili do przeglądania
async function loadSwipeProfiles() {
    if (!currentProfileId || !authToken) return;
    
    try {
        cardsContainer.innerHTML = '<div class="card-placeholder"><p>Ładowanie profili...</p></div>';
        
        const response = await fetch(`${API_URL}/profiles/${currentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const profiles = await response.json();
        
        if (response.ok) {
            currentSwipeProfiles = profiles;
            currentSwipeIndex = 0;
            renderCurrentProfile();
        } else {
            console.error('Nie udało się pobrać profili');
            cardsContainer.innerHTML = '<div class="card-placeholder"><p>Nie udało się pobrać profili</p></div>';
        }
    } catch (error) {
        console.error('Błąd podczas pobierania profili:', error);
        cardsContainer.innerHTML = '<div class="card-placeholder"><p>Wystąpił błąd podczas komunikacji z serwerem</p></div>';
    }
}

// Renderowanie aktualnego profilu do przeglądania
function renderCurrentProfile() {
    // Wyczyść kontener
    cardsContainer.innerHTML = '';
    
    if (currentSwipeProfiles.length === 0) {
        cardsContainer.innerHTML = '<div class="card-placeholder"><p>Brak nowych profili do przeglądania</p></div>';
        return;
    }
    
    if (currentSwipeIndex >= currentSwipeProfiles.length) {
        cardsContainer.innerHTML = '<div class="card-placeholder"><p>Obejrzałeś już wszystkie dostępne profile</p></div>';
        return;
    }
    
    const profile = currentSwipeProfiles[currentSwipeIndex];
    const defaultPhoto = 'https://via.placeholder.com/400x500?text=No+Photo';
    
    const cardHTML = `
        <div class="profile-card" id="current-card" data-profile-id="${profile._id}">
            <div class="profile-photo" style="background-image: url(${profile.photoUrl || defaultPhoto})"></div>
            <div class="profile-info">
                <h3>${profile.name || 'Brak imienia'}, <span class="profile-age">${profile.age || '?'}</span></h3>
                <p class="profile-bio">${profile.bio || 'Brak opisu'}</p>
                ${profile.interests && profile.interests.length > 0 
                  ? `<p class="profile-interests">Zainteresowania: ${profile.interests.join(', ')}</p>` 
                  : ''}
            </div>
        </div>
    `;
    
    cardsContainer.innerHTML = cardHTML;
}

// Obsługa swipe'ów (like/dislike)
async function handleSwipe(action) {
    if (!currentProfileId || !authToken || currentSwipeProfiles.length === 0 || currentSwipeIndex >= currentSwipeProfiles.length) {
        return;
    }
    
    const profileToSwipe = currentSwipeProfiles[currentSwipeIndex];
    const cardElement = document.getElementById('current-card');
    
    try {
        let endpoint, data, animationClass;
        
        if (action === 'like') {
            endpoint = `${API_URL}/like`;
            data = {
                profileId: currentProfileId,
                likedProfileId: profileToSwipe._id
            };
            animationClass = 'swiped-right';
        } else {
            endpoint = `${API_URL}/dislike`;
            data = {
                profileId: currentProfileId,
                dislikedProfileId: profileToSwipe._id
            };
            animationClass = 'swiped-left';
        }
        
        // Wyślij informację o akcji do API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data),
        });
        
        const responseData = await response.json();
        
        // Animacja swipe'a
        if (cardElement) {
            cardElement.classList.add(animationClass);
        }
        
        // Poczekaj na zakończenie animacji
        setTimeout(() => {
            currentSwipeIndex++;
            renderCurrentProfile();
            
            // Jeśli to dopasowanie, pokaż modal
            if (action === 'like' && responseData.isMatch) {
                showMatchModal(profileToSwipe);
            }
        }, 300);
        
    } catch (error) {
        console.error(`Błąd podczas ${action === 'like' ? 'polubienia' : 'odrzucenia'} profilu:`, error);
        alert('Wystąpił błąd podczas komunikacji z serwerem.');
    }
}

// Ładowanie dopasowań
async function loadMatches() {
    if (!currentProfileId || !authToken) return;
    
    try {
        matchesList.innerHTML = '<p class="loading">Ładowanie dopasowań...</p>';
        
        const response = await fetch(`${API_URL}/matches/${currentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const matches = await response.json();
        
        if (response.ok) {
            if (matches.length === 0) {
                matchesList.innerHTML = '<p class="empty-state">Nie masz jeszcze żadnych dopasowań</p>';
                return;
            }
            
            // Pobieranie konwersacji dla sprawdzenia nieprzeczytanych wiadomości
            const conversationsResponse = await fetch(`${API_URL}/conversations/${currentProfileId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            let conversations = [];
            if (conversationsResponse.ok) {
                conversations = await conversationsResponse.json();
            }
            
            // Mapa nieprzeczytanych wiadomości (profileId -> liczba)
            const unreadCount = {};
            conversations.forEach(conv => {
                if (conv.unreadCount > 0) {
                    unreadCount[conv.profileId] = conv.unreadCount;
                }
            });
            
            let matchesHTML = '';
            matches.forEach(match => {
                const defaultPhoto = 'https://via.placeholder.com/60x60?text=No+Photo';
                const hasUnread = unreadCount[match.profile._id] > 0;
                
                matchesHTML += `
                    <div class="match-card" data-profile-id="${match.profile._id}" data-name="${match.profile.name}">
                        <div class="match-photo" style="background-image: url(${match.profile.photoUrl || defaultPhoto})"></div>
                        <div class="match-info">
                            <h3>${match.profile.name || 'Brak imienia'}, ${match.profile.age || '?'}</h3>
                            <p class="match-date">Dopasowanie: ${new Date(match.profile.matchDate).toLocaleDateString()}</p>
                        </div>
                        ${hasUnread ? `<div class="unread-badge">${unreadCount[match.profile._id]}</div>` : ''}
                    </div>
                `;
            });
            
            matchesList.innerHTML = matchesHTML;
            
            // Dodanie event listenerów do rozpoczęcia czatu
            document.querySelectorAll('.match-card').forEach(card => {
                card.addEventListener('click', () => {
                    const profileId = card.dataset.profileId;
                    const name = card.dataset.name;
                    openChat(profileId, name);
                });
            });
            
        } else {
            console.error('Nie udało się pobrać dopasowań');
            matchesList.innerHTML = '<p class="empty-state">Wystąpił błąd podczas pobierania dopasowań</p>';
        }
    } catch (error) {
        console.error('Błąd podczas pobierania dopasowań:', error);
        matchesList.innerHTML = '<p class="empty-state">Wystąpił błąd podczas komunikacji z serwerem</p>';
    }
}

// Otwieranie czatu z danym profilem
async function openChat(profileId, name) {
    if (!currentProfileId || !authToken) return;
    
    try {
        // Zapamiętaj ID profilu, z którym czatujemy
        currentChatProfileId = profileId;
        
        // Ustaw nazwę rozmówcy
        chatWithName.textContent = name;
        
        // Wyczyść poprzednie wiadomości
        chatMessages.innerHTML = '<p class="loading">Ładowanie wiadomości...</p>';
        
        // Pobieranie wiadomości
        const response = await fetch(`${API_URL}/messages/${currentProfileId}/${profileId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            
            // Wyświetl wiadomości
            chatMessages.innerHTML = '';
            
            if (messages.length === 0) {
                chatMessages.innerHTML = '<p class="empty-state">Brak wiadomości. Rozpocznij konwersację!</p>';
            } else {
                messages.forEach(message => {
                    const isSent = message.senderId === currentProfileId;
                    addMessageToChat(message, isSent, false);
                });
                
                // Przewiń na dół
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Przejdź do ekranu czatu
            switchScreen('chat');
            
            // Oznacz wiadomości jako przeczytane
            markMessagesAsRead(profileId);
            
        } else {
            console.error('Nie udało się pobrać wiadomości');
            alert('Nie udało się pobrać wiadomości');
        }
    } catch (error) {
        console.error('Błąd podczas otwierania czatu:', error);
        alert('Wystąpił błąd podczas komunikacji z serwerem');
    }
}

// Dodanie wiadomości do czatu
function addMessageToChat(message, isSent, scrollToBottom = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isSent ? 'sent' : 'received');
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageElement.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    
    if (scrollToBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Oznaczenie wiadomości jako przeczytane
function markMessagesAsRead(senderId) {
    if (!socket || !currentProfileId) return;
    
    socket.emit('markAsRead', {
        profileId: currentProfileId,
        otherProfileId: senderId
    });
    
    // Zaktualizuj UI - usuń badge z nieprzeczytanymi wiadomościami
    const matchCard = document.querySelector(`.match-card[data-profile-id="${senderId}"]`);
    if (matchCard) {
        const badge = matchCard.querySelector('.unread-badge');
        if (badge) {
            badge.remove();
        }
    }
}

// Aktualizacja badge'a z nieprzeczytanymi wiadomościami
function updateUnreadBadge(senderId) {
    const matchCard = document.querySelector(`.match-card[data-profile-id="${senderId}"]`);
    if (!matchCard) return;
    
    let badge = matchCard.querySelector('.unread-badge');
    
    if (badge) {
        // Zwiększ licznik
        const count = parseInt(badge.textContent) + 1;
        badge.textContent = count;
    } else {
        // Utwórz nowy badge
        badge = document.createElement('div');
        badge.classList.add('unread-badge');
        badge.textContent = '1';
        matchCard.appendChild(badge);
    }
}

// Wysyłanie wiadomości
async function handleSendMessage(e) {
    e.preventDefault();
    
    const content = chatInput.value.trim();
    
    if (!content || !currentProfileId || !currentChatProfileId || !socket) {
        return;
    }
    
    // Wyślij wiadomość przez Socket.IO
    socket.emit('sendMessage', {
        senderId: currentProfileId,
        receiverId: currentChatProfileId,
        content
    });
    
    // Wyczyść pole tekstowe
    chatInput.value = '';
}

// Wyświetlanie modala z informacją o dopasowaniu
function showMatchModal(matchedProfile) {
    const defaultPhoto = 'https://via.placeholder.com/100x100?text=No+Photo';
    
    matchProfileInfo.innerHTML = `
        <div class="match-profile-photo" style="background-image: url(${matchedProfile.photoUrl || defaultPhoto})"></div>
        <h3>${matchedProfile.name || 'Brak imienia'}, ${matchedProfile.age || '?'}</h3>
        <p>Też Cię polubił(a)! Możecie teraz zacząć rozmowę.</p>
    `;
    
    // Zapamiętaj ID dopasowanego profilu dla przycisku rozpoczęcia czatu
    startChatModalBtn.dataset.profileId = matchedProfile._id;
    startChatModalBtn.dataset.name = matchedProfile.name;
    
    matchModal.classList.add('active');
}

// Ukrywanie modala z informacją o dopasowaniu
function hideMatchModal() {
    matchModal.classList.remove('active');
}

// Rozpoczęcie czatu z modala dopasowania
function handleStartChatFromModal() {
    const profileId = startChatModalBtn.dataset.profileId;
    const name = startChatModalBtn.dataset.name;
    
    // Najpierw ukryj modal
    hideMatchModal();
    
    // Następnie otwórz czat
    if (profileId) {
        openChat(profileId, name);
    }
} 