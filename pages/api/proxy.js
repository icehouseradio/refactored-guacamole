import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';
  const parsedUrl = new URL(streamUrl);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Transfer-Encoding', 'chunked'); // Explicitly tell client we're chunking

  let proxyRequest; // Declare proxyRequest outside to be accessible in req.on('close')

  try {
    proxyRequest = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy-Stream',
      },
    }, (proxyResponse) => {
      // It's still good practice to copy headers if the source provided them
      for (const header in proxyResponse.headers) {
        if (header.toLowerCase() !== 'content-length' && header.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(header, proxyResponse.headers[header]);
        }
      }
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }

      // --- THIS IS THE CRUCIAL CHANGE: MANUAL CHUNKING ---
      proxyResponse.on('data', (chunk) => {
        if (!res.writableEnded) { // Only write if the client connection is still active
          res.write(chunk);
        }
      });

      proxyResponse.on('end', () => {
        if (!res.writableEnded) {
          res.end(); // End the client response when source stream ends
          console.log('Proxy response stream ended successfully (manual).');
        }
      });

      proxyResponse.on('error', (err) => {
        console.error('Proxy response stream error (manual):', err.message);
        if (!res.headersSent) {
          res.status(500).send('Proxy response stream error (manual)');
        } else {
          res.end();
        }
      });
      // --- END OF CRUCIAL CHANGE ---
    });

    proxyRequest.on('error', (err) => {
      console.error('Proxy request error (manual):', err.message);
      if (!res.headersSent) {
        res.status(500).send('Proxy request connection error (manual)');
      } else {
        res.end();
      }
    });

    proxyRequest.end();

    // Handle client disconnection
    req.on('close', () => {
      console.log('Client disconnected. Aborting proxy request (manual).');
      if (proxyRequest) { // Ensure proxyRequest is defined before aborting
        proxyRequest.destroy(); // Use destroy for incoming client requests, abort for outgoing http requests.
      }
    });

  } catch (err) {
    console.error('Outer proxy handler error (manual):', err.message);
    if (!res.headersSent) {
      res.status(500).send('Outer proxy handler setup error (manual)');
    } else {
      res.end();
    }
  }
}
