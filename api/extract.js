// Vercel serverless function: photo -> roll/cq/mcq. The API key stays on the server.
const PROMPT = `Chhobite student-der marks-er table/list ache. Prottek student-er Roll, CQ mark ar MCQ mark pore ber koro.
Rules:
- Sudhu Roll, CQ, MCQ nao. Total/grade/onno column thakle ignore koro.
- Kono value spasto na hole, porte nischit na hole, ba khali thakle oi field-er jonno null dao. Kokhono guess korbe na.
- Chhobite jemon order-e ache temon order-e dao. Ekoi student duibar dio na.
Reply with ONLY a JSON array, no other text: [{"roll":number|null,"cq":number|null,"mcq":number|null}]`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const image = req.body && req.body.image;
  if (typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,'))
    return res.status(400).json({ error: 'bad image' });
  if (image.length > 4_000_000) return res.status(413).json({ error: 'image too large' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.split(',')[1] } },
          { type: 'text', text: PROMPT },
        ] }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI error' });
    const text = j.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const rows = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: 'Chhobi pora gelo na' });
  }
}
