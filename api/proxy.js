export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';

  try {
    const response = await fetch(streamUrl);

    if (!response.ok || !response.body) {
      return res.status(502).send('Stream unavailable');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');

    response.body.pipe(res);
  } catch (err) {
    console.error('Proxy stream error:', err);
    res.status(500).send('Proxy error');
  }
}
