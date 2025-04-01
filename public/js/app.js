// Globalne zmienne
let currentProfileId = null;
let currentSwipeProfiles = [];
let currentSwipeIndex = 0;

// API URL - backend działa na porcie 3000
const API_URL = 'http://localhost:3000';

// Elementy DOM
const profileScreen = document.getElementById('profile-screen');
const swipeScreen = document.getElementById('swipe-screen');
const matchesScreen = document.getElementById('matches-screen');

const profileBtn = document.getElementById('profile-btn');
const swipeBtn = document.getElementById('swipe-btn');
const matchesBtn = document.getElementById('matches-btn');

const profileForm = document.getElementById('profile-form');
const cardsContainer = document.getElementById('cards-container');
const matchesList = document.getElementById('matches-list');

const likeBtn = document.getElementById('like-btn');
const dislikeBtn = document.getElementById('dislike-btn');

const matchModal = document.getElementById('match-modal');
const matchProfileInfo = document.getElementById('match-profile-info');
const closeMatchModalBtn = document.getElementById('close-match-modal');

// Event Listenery
document.addEventListener('DOMContentLoaded', init);

profileBtn.addEventListener('click', () => switchScreen('profile'));
swipeBtn.addEventListener('click', () => switchScreen('swipe'));
matchesBtn.addEventListener('click', () => switchScreen('matches'));

profileForm.addEventListener('submit', handleProfileSubmit);
likeBtn.addEventListener('click', () => handleSwipe('like'));
dislikeBtn.addEventListener('click', () => handleSwipe('dislike'));
closeMatchModalBtn.addEventListener('click', hideMatchModal);

// Inicjalizacja aplikacji
async function init() {
    // Sprawdź, czy użytkownik ma już profil (localStorage)
    const storedProfileId = localStorage.getItem('profileId');
    
    if (storedProfileId) {
        // Jeśli ma profil, załaduj dane
        currentProfileId = storedProfileId;
        await loadProfileData();
        await loadSwipeProfiles();
        await loadMatches();
        switchScreen('swipe');
    } else {
        // Jeśli nie ma, pokaż ekran tworzenia profilu
        switchScreen('profile');
    }
}

// Zmiana aktywnego ekranu
function switchScreen(screenName) {
    // Ukryj wszystkie ekrany
    profileScreen.classList.remove('active');
    swipeScreen.classList.remove('active');
    matchesScreen.classList.remove('active');
    
    // Usuń klasę aktywny z przycisków nawigacji
    profileBtn.classList.remove('active');
    swipeBtn.classList.remove('active');
    matchesBtn.classList.remove('active');
    
    // Pokaż wybrany ekran i ustaw aktywny przycisk
    switch (screenName) {
        case 'profile':
            profileScreen.classList.add('active');
            profileBtn.classList.add('active');
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
    }
}

// Obsługa formularza profilu
async function handleProfileSubmit(e) {
    e.preventDefault();
    
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
                },
                body: JSON.stringify(profileData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Zapisz ID profilu
                currentProfileId = data.profileId;
                localStorage.setItem('profileId', currentProfileId);
                
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
    if (!currentProfileId) return;
    
    try {
        const response = await fetch(`${API_URL}/profile/${currentProfileId}`);
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
    if (!currentProfileId) return;
    
    try {
        cardsContainer.innerHTML = '<div class="card-placeholder"><p>Ładowanie profili...</p></div>';
        
        const response = await fetch(`${API_URL}/profiles/${currentProfileId}`);
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
    if (!currentProfileId || currentSwipeProfiles.length === 0 || currentSwipeIndex >= currentSwipeProfiles.length) {
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
    if (!currentProfileId) return;
    
    try {
        matchesList.innerHTML = '<p class="loading">Ładowanie dopasowań...</p>';
        
        const response = await fetch(`${API_URL}/matches/${currentProfileId}`);
        const matches = await response.json();
        
        if (response.ok) {
            if (matches.length === 0) {
                matchesList.innerHTML = '<p class="empty-state">Nie masz jeszcze żadnych dopasowań</p>';
                return;
            }
            
            let matchesHTML = '';
            matches.forEach(match => {
                const defaultPhoto = 'https://via.placeholder.com/60x60?text=No+Photo';
                
                matchesHTML += `
                    <div class="match-card" data-match-id="${match.matchId}">
                        <div class="match-photo" style="background-image: url(${match.profile.photoUrl || defaultPhoto})"></div>
                        <div class="match-info">
                            <h3>${match.profile.name || 'Brak imienia'}, ${match.profile.age || '?'}</h3>
                            <p class="match-date">Dopasowanie: ${new Date(match.profile.matchDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
            });
            
            matchesList.innerHTML = matchesHTML;
            
            // Dodanie event listenerów do kart dopasowań (dla przyszłej implementacji czatu)
            document.querySelectorAll('.match-card').forEach(card => {
                card.addEventListener('click', () => {
                    alert('Czat nie jest jeszcze zaimplementowany');
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

// Wyświetlanie modala z informacją o dopasowaniu
function showMatchModal(matchedProfile) {
    const defaultPhoto = 'https://via.placeholder.com/100x100?text=No+Photo';
    
    matchProfileInfo.innerHTML = `
        <div class="match-profile-photo" style="background-image: url(${matchedProfile.photoUrl || defaultPhoto})"></div>
        <h3>${matchedProfile.name || 'Brak imienia'}, ${matchedProfile.age || '?'}</h3>
        <p>Też Cię polubił(a)! Możecie teraz zacząć rozmowę.</p>
    `;
    
    matchModal.classList.add('active');
}

// Ukrywanie modala z informacją o dopasowaniu
function hideMatchModal() {
    matchModal.classList.remove('active');
} 