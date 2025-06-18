// No 'got' import needed anymore
import http from 'http';
import https from 'https'; // Use https for secure connections if target was HTTPS

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';
  const parsedUrl = new URL(streamUrl); // Parse the URL to get host, port, path

  // Determine which module to use based on protocol
  const client = parsedUrl.protocol === 'https:' ? https : http;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store'); // Important for streams

  try {
    const proxyRequest = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80), // Default ports
      path: parsedUrl.pathname + parsedUrl.search, // Include query params
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy-Stream',
        // Forward other relevant headers if needed, e.g., 'Range', 'Accept'
      },
    }, (proxyResponse) => {
      // Set response headers from the proxyResponse, especially Content-Type
      // It's good to copy all relevant headers to preserve the original stream's properties
      for (const header in proxyResponse.headers) {
        // Avoid issues with content-length for streaming, and potential transfer-encoding
        if (header.toLowerCase() !== 'content-length' && header.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(header, proxyResponse.headers[header]);
        }
      }

      // Ensure Content-Type is audio/mpeg if it wasn't set or was wrong
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }

      // Pipe the proxy response stream to the Vercel response
      proxyResponse.pipe(res);

      proxyResponse.on('error', (err) => {
        console.error('Proxy response stream error:', err.message);
        if (!res.headersSent) {
          res.status(500).send('Proxy response stream error');
        } else {
          res.end();
        }
      });

      proxyResponse.on('end', () => {
        console.log('Proxy response stream ended successfully.');
      });
    });

    // Handle errors on the proxy request itself (e.g., network issues)
    proxyRequest.on('error', (err) => {
      console.error('Proxy request error:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Proxy request connection error');
      } else {
        res.end();
      }
    });

    // End the request, initiating the connection
    proxyRequest.end();

    // Handle client disconnection
    req.on('close', () => {
      console.log('Client disconnected. Aborting proxy request.');
      proxyRequest.abort(); // Abort the request to the source
    });

    req.on('error', (err) => {
      console.error('Client request error:', err.message);
    });

  } catch (err) {
    console.error('Outer proxy handler error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Outer proxy handler setup error');
    } else {
      res.end();
    }
  }
}
