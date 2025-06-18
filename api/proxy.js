import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  // Define the target audio stream URL
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';
  // Parse the URL to extract hostname, port, and path for Node.js http/https module
  const parsedUrl = new URL(streamUrl);
  // Determine whether to use http or https module based on the protocol
  const client = parsedUrl.protocol === 'https:' ? https : http;

  // Set necessary CORS headers for the browser to access the proxy
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
  // Set Content-Type to audio/mpeg to tell the browser it's an MP3 stream
  res.setHeader('Content-Type', 'audio/mpeg');
  // Disable caching for the stream to ensure live data
  res.setHeader('Cache-Control', 'no-store');
  // Explicitly set Transfer-Encoding to chunked as we're sending data in chunks
  res.setHeader('Transfer-Encoding', 'chunked');

  let proxyRequest; // Declare proxyRequest outside to be accessible in the client disconnection handler

  try {
    // Make a request to the target audio stream
    proxyRequest = client.request({
      hostname: parsedUrl.hostname, // Target server hostname
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80), // Target server port (default 80 for http, 443 for https)
      path: parsedUrl.pathname + parsedUrl.search, // Path and query parameters
      method: 'GET', // HTTP method
      headers: {
        // Forward User-Agent or provide a custom one
        'User-Agent': req.headers['user-agent'] || 'Vercel-Audio-Proxy',
        // You might want to forward other headers like 'Accept' or 'Range' if relevant
      },
    }, (proxyResponse) => {
      // Once we get a response from the target stream, set client response headers
      for (const header in proxyResponse.headers) {
        // Avoid copying 'content-length' and 'transfer-encoding' from source
        // as we are manually chunking and the length will be unknown until stream ends.
        if (header.toLowerCase() !== 'content-length' && header.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(header, proxyResponse.headers[header]);
        }
      }
      // Ensure Content-Type is set if not already from source
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }

      // --- CRUCIAL CHANGE: Manually read data chunks and write to response ---
      proxyResponse.on('data', (chunk) => {
        // Write the data chunk to the Vercel response as long as the connection is open
        if (!res.writableEnded) {
          res.write(chunk);
        }
      });

      // When the source stream ends, also end the Vercel response
      proxyResponse.on('end', () => {
        if (!res.writableEnded) {
          res.end();
          console.log('Proxy response stream ended successfully (manual chunking).');
        }
      });

      // Handle errors from the source stream
      proxyResponse.on('error', (err) => {
        console.error('Proxy response stream error (manual chunking):', err.message);
        if (!res.headersSent) {
          res.status(500).send('Proxy response stream error (manual chunking)');
        } else {
          res.end(); // Just end if headers already sent
        }
      });
      // --- END OF CRUCIAL CHANGE ---
    });

    // Handle errors that occur when making the request to the target stream (e.g., network issues)
    proxyRequest.on('error', (err) => {
      console.error('Proxy request error (manual chunking):', err.message);
      if (!res.headersSent) {
        res.status(500).send('Proxy request connection error (manual chunking)');
      } else {
        res.end();
      }
    });

    // End the request to the target stream, initiating the connection
    proxyRequest.end();

    // Handle client disconnection from our Vercel proxy
    req.on('close', () => {
      console.log('Client disconnected. Aborting proxy request (manual chunking).');
      if (proxyRequest) {
        proxyRequest.destroy(); // Destroy the connection to the source stream
      }
    });

  } catch (err) {
    // Catch any synchronous errors during the setup of the handler
    console.error('Outer proxy handler error (manual chunking):', err.message);
    if (!res.headersSent) {
      res.status(500).send('Outer proxy handler setup error (manual chunking)');
    } else {
      res.end();
    }
  }
}
