import got from 'got';

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';

  try {
    const stream = got.stream(streamUrl);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).send('Stream proxy error');
    });

    stream.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy handler error');
  }
}
