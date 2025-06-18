import got from 'got';

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';

  try {
    // Use got.get() which returns a promise for the response
    // The response.body property will be a stream.
    const response = await got.get(streamUrl, {
      timeout: {
        request: 10000 // Timeout for the entire request (10 seconds)
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');

    // Check if response.body exists and has a pipe method
    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);

      response.body.on('error', (err) => {
        console.error('Inner stream error from got response:', err);
        res.status(500).send('Stream proxy error during piping');
      });

      res.on('finish', () => {
        console.log('Stream successfully sent to client.');
      });

    } else {
      console.error('Got response body is not a readable stream:', response.body);
      res.status(500).send('Proxy initialization error: Stream not available');
    }

  } catch (err) {
    console.error('Proxy handler error (caught by outer try/catch):', err.message);
    res.status(500).send('Proxy handler error: ' + err.message);
  }
}
