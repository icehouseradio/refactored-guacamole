import got from 'got';

export default async function handler(req, res) {
  const streamUrl = 'http://167.71.103.22:8000/stream.mp3';

  try {
    const stream = got.stream(streamUrl);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    export default async function handler(req, res) {
  console.log('Proxy function started!');
  res.status(200).send('Proxy function is alive! (No audio yet)');
  console.log('Proxy function finished!');
}
