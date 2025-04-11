require('dotenv').config();
const express = require('express');
const querystring = require('querystring');
const axios = require('axios');

const app = express();
const port = 3000;

// Zmienne środowiskowe
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'http://127.0.0.1:3000/callback';

let ACCESS_TOKEN = '';  // Będzie przechowywać aktualny token
let REFRESH_TOKEN = '';  // Będzie przechowywać aktualny token odświeżający

// Funkcja do generowania losowego ciągu znaków
const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Endpoint do logowania
app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email user-read-playback-state'; // Dodano user-read-playback-state

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});


// Endpoint callback do obsługi kodu autoryzacyjnego
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('Brak kodu autoryzacyjnego');
  }

  try {
    // Wymiana kodu na token dostępu
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      client_id: client_id,
      client_secret: client_secret
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Zwróć tokeny lub użyj ich w aplikacji
    ACCESS_TOKEN = access_token;
    REFRESH_TOKEN = refresh_token;
    res.json({
      access_token,
      refresh_token
    });
  } catch (error) {
    console.error('Błąd podczas wymiany kodu na token:', error.response?.data || error.message);
    res.status(500).send('Wystąpił błąd podczas wymiany kodu na token');
  }
});

app.get('/nowplaying', async (req, res) => {

  if (!ACCESS_TOKEN) {
    return res.status(401).send('Brak tokenu dostępu');
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (response.data && response.data.item) {
      res.json({
        title: response.data.item.name,
        artist: response.data.item.artists.map(a => a.name).join(', '),
        album: response.data.item.album.name,
        imageUrl: response.data.item.album.images[0]?.url || null
      });
    } else {
      res.json({ message: 'Brak odtwarzanej piosenki' });
    }
  } catch (error) {
    console.error('Błąd podczas pobierania obecnie odtwarzanej piosenki:', error.message);
    res.status(500).send('Wystąpił błąd podczas pobierania piosenki: '+error.message);
  }
});

// Uruchomienie serwera
app.listen(port,'0.0.0.0', () => {
  console.log(`Aplikacja działa na http://localhost:${port}`);
});
