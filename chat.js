export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set' });
  }

  let system, messages;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    system   = body.system   || '';
    messages = body.messages || [];
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5',
        max_tokens: 1200,
        system,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(upstream.status).json({ error: data?.error?.message || 'Anthropic API error' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Fetch error:', err.message);
    return res.status(500).json({ error: 'Could not reach Anthropic API: ' + err.message });
  }
}
