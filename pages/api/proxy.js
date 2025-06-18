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

   import got from 'got';

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const remoteStream = got.stream(streamUrl);

    // Handle errors on the remote stream
    remoteStream.on('error', (err) => {
      console.error('Remote stream error (from got):', err.message);
      if (!res.headersSent) { // Only send error if headers haven't been sent yet
        res.status(500).send('Stream proxy error from source');
      } else {
        res.end(); // If headers sent, just end the response
      }
    });

    // Pipe the remote stream directly to the response
    remoteStream.pipe(res);

    // Handle client disconnection (optional, but good practice for long streams)
    req.on('close', () => {
      console.log('Client disconnected. Destroying remote stream.');
      remoteStream.destroy(); // Stop receiving data from the source
    });

    // Log when the piping is finished or client closes
    res.on('finish', () => {
      console.log('Response stream finished.');
    });
    res.on('close', () => {
      console.log('Response stream closed.');
    });

  } catch (err) {
    console.error('Proxy handler error (outer catch):', err.message);
    if (!res.headersSent) {
      res.status(500).send('Proxy handler setup error');
    } else {
      res.end();
    }
  }
}
