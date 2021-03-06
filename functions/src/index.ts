const puppeteer = require('puppeteer');
const functions = require('firebase-functions');
const axios = require('axios').default;

const nova = [
  {
    name: 'Radio Nova',
    playlistId: '6GhFJfQ9pTY578m3l3CfOd',
    frequence: '910',
  },
  {
    name: 'Nouvo Nova',
    playlistId: '22x26Yktyw49iHcC5l0GOR',
    frequence: '79676',
  },
  {
    name: 'Nova la Nuit',
    playlistId: '5IWE2zzGBxQmf1g3aI2sFa',
    frequence: '916',
  },
  {
    name: 'Nova Classics',
    playlistId: '013LrKxrQkVpoJTts6gin3',
    frequence: '913',
  },
  {
    name: 'Nova Danse',
    playlistId: '24WXdbI5caT1TZKlipmxzE',
    frequence: '560',
  },
];
const limitTracksToCheck = 10;

/// PUB SUB JOB
export const saveNovaEveryFiveMinutes = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (req: any, res: any) => {
    // create a request per radio
    const requestsArray = nova.map((radio) => {
      const request = axios({
        headers: {
          'Content-Type': 'application/json',
        },
        url:
          'https://us-central1-listy-bcc65.cloudfunctions.net/saveNovaOnSpotify',
        data: {
          playlistId: radio.playlistId,
          frequence: radio.frequence,
        },
        method: 'POST',
      });

      return request;
    });
    // send requests
    await Promise.all(
      requestsArray.map(async (request) => {
        return await request
          .then((response: any) => {
            console.log('promises well sent');
          })
          .catch((err: any) => console.log('Something broke!', err));
      })
    )
      .then(() => {
        console.log('All good!');
      })
      .catch((err) => console.log('something went wrong.. ', err));
  });

////////////////// SAVE NOVA SONGS ON SPOTIFY //////////////////
exports.saveNovaOnSpotify = functions
  .runWith({
    timeoutSeconds: 500,
  })
  .https.onRequest(async (req: any, res: any) => {
    const trackIds = await scrapeNovaTrackIds(req.body.frequence);

    const headers = await getSpotifyAuthHeaders();

    const playlistLastTrackIds = await getPlaylistLastTrackIds(
      headers,
      req.body.playlistId,
      limitTracksToCheck
    );

    // filter nova trackIds with duplicates
    const filteredIds = trackIds.filter(
      (id) => !playlistLastTrackIds.includes(id)
    );

    // format uris
    const uris = filteredIds.map((id) => `spotify:track:${id}`).reverse();

    const response = await saveTracksToPlaylist(
      headers,
      req.body.playlistId,
      uris
    );

    res.end(response);
  });

/////////////////////// SCRAPE NOVA ///////////////////////
async function scrapeNovaTrackIds(radioValue: string): Promise<string[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  // mock CET time
  await page.emulateTimezone('Europe/Brussels');

  // go to Nova
  await page.goto('https://www.nova.fr/c-etait-quoi-ce-titre/');
  // accept cookies
  await page.click('[id="didomi-notice-agree-button"]');
  // select nouvo nova radio
  await page.select('#radio', radioValue);

  // save the form
  await page.evaluate(() => {
    const element: HTMLElement | null = document.querySelector(
      '#js-mobile-program-filter > a'
    );
    element?.click();
  });

  // wait for page to load
  await page.waitForTimeout(2000);

  // get spotify links
  const data = await page.evaluate(async () => {
    const links = document.querySelectorAll('a');
    const urls = Array.from(links)
      .map((link) => link.href)
      .filter((href) => href.includes('spotify'));

    return urls;
  });

  await browser.close();

  // save trackIds
  const trackIds: string[] = [];
  data.map((trackUrl: string) => {
    const trackId = trackUrl.substring(trackUrl.indexOf('k') + 2);
    trackIds.push(trackId);
  });

  return trackIds;
}

/////////////////////// HEADERS ///////////////////////
async function getSpotifyAuthHeaders(): Promise<Object> {
  // refresh access token
  const secret = Buffer.from(
    `${functions.config().spotify.clientid}:${
      functions.config().spotify.clientsecret
    }`
  ).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', functions.config().spotify.refreshtoken);

  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${secret}`,
    },
  };

  let token = '';

  await axios
    .post('https://accounts.spotify.com/api/token', params, config)
    .then(
      (response: any) => {
        token = response.data.access_token;
      },
      (error: any) => {
        console.log('error: ', error);
      }
    );

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  return headers;
}

/////////////////////// GET PLAYLIST LAST TRACK IDS ///////////////////////
async function getPlaylistLastTrackIds(
  headers: Object,
  playlistId: string,
  limit: number
): Promise<string[]> {
  // get nova playlist total track number
  let novaPlaylistTotal = 0;
  await axios({
    headers,
    url: `https://api.spotify.com/v1/playlists/${playlistId}`,
  }).then((response: any) => {
    novaPlaylistTotal = response.data.tracks.total;
  });

  // get nova playlist last track ids:
  // variables
  const offset = novaPlaylistTotal - limit > 0 ? novaPlaylistTotal - limit : 0;
  const lastTracks: any[] = [];

  // request
  await axios({
    headers,
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
  }).then(
    (response: any) => {
      lastTracks.push(response.data.items);
    },
    (error: any) => {
      console.log('error: ', error);
    }
  );

  // formatting
  const lastTrackIds = lastTracks.map((track) => {
    return track.map((t: any) => t.track.id);
  })[0];

  return lastTrackIds;
}

/////////////////////// SAVE TRACKS TO SPOTIFY ///////////////////////
async function saveTracksToPlaylist(
  headers: Object,
  playlistId: string,
  uris: string[]
): Promise<string> {
  let res = '';
  // add tracks to playlist
  if (uris.length > 0) {
    await axios({
      method: 'POST',
      headers,
      url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      data: {
        uris: uris,
      },
    }).then(
      (response: any) => {
        console.log('response status: ', response.status);
        res = `response status: ${response.status}`;
      },
      (error: any) => {
        console.log('error: ', error);
        res = `error: ${error}`;
      }
    );
  }
  return res;
}
