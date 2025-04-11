require('dotenv').config(); // Załaduj zmienne środowiskowe
const express = require('express');
const axios = require('axios'); // Biblioteka do wykonywania zapytań HTTP

const app = express();

let accessToken = '';  // Będzie przechowywać aktualny token

// Funkcja do pobierania tokena dostępu z API Spotify
async function getAccessToken() {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = new URLSearchParams();
  
  // Dodaj dane do zapytania
  data.append('grant_type', 'client_credentials');
  data.append('client_id', process.env.SPOTIFY_CLIENT_ID ?? "");  // Pobierz client_id z .env
  data.append('client_secret', process.env.SPOTIFY_CLIENT_SECRET ?? "");  // Pobierz client_secret z .env

  try {
    const response = await axios.post(tokenUrl, data.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Zwróć token
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw error;
  }
}

// Endpoint do pobrania obecnie odtwarzanej piosenki
async function getCurrentlyPlayingSong() {
  const url = 'https://api.spotify.com/v1/me/player/currently-playing';

  try {
    // Zapytanie do Spotify API z nagłówkiem zawierającym token dostępu
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}` // Przekazanie tokena w nagłówku
      }
    });

    // Jeśli jest odtwarzany utwór
    if (response.data && response.data.item) {
      return {
        title: response.data.item.name,
        artist: response.data.item.artists.map(a => a.name).join(', '),
        album: response.data.item.album.name,
        imageUrl: response.data.item.album.images[0]?.url || null
      };
    } else {
      return { message: 'No track is currently playing.' };
    }
  } catch (error) {
    console.error('Error fetching currently playing song:', error);
    return { error: 'Failed to fetch currently playing song: '+error.message };
  }
}

// Endpoint Express do pobierania obecnie słuchanej piosenki
app.get('/nowplaying', async (req, res) => {
  try {
    // Jeśli token nie jest dostępny, pobierz go
    if (!accessToken) {
      accessToken = await getAccessToken();
    }

    const song = await getCurrentlyPlayingSong();
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currently playing song' });
  }
});

// Funkcja uruchamiająca serwer
async function startServer() {
  try {
    // Pobierz token dostępu przy starcie serwera
    accessToken = await getAccessToken();
    console.log('Access Token obtained:', accessToken);
    
    // Uruchom serwer
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  } catch (error) {
    console.error('Failed to get access token, server will not start:', error);
  }
}

startServer();
