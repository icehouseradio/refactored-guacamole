export default async function handler(req, res) {
  console.log('--- Vercel Function Invoked! ---'); // Add this log
  res.status(200).send('Hello from Vercel!');
}
