const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TONE_DESCRIPTIONS = {
  // Free tones
  witty:         'clever and quick-witted, using wordplay and intelligence',
  sarcastic:     'dripping with sarcasm and irony',
  savage:        'brutally direct and cutting, no mercy',
  deadpan:       'completely dry and emotionless, matter-of-fact',
  'valley-girl': 'using valley girl slang, like totally dismissive',
  corporate:     'using passive-aggressive corporate speak and buzzwords',
  // Premium tones
  shakespearean: 'in flowery Shakespearean English with thees and thous',
  southern:      'with Southern charm that barely conceals the venom — honeyed words with a steel blade underneath',
  brimstone:     'as a fire-and-brimstone preacher delivering righteous condemnation — biblical fury, Old Testament wrath, and righteous indignation at their sheer audacity',
  therapist:     'as a passive-aggressive therapist — weaponized empathy, clinical language, and feigned concern that makes the roast land harder than any direct insult ever could',
  chef:          'with the furious passion of an elite chef who has been served something disgraceful — culinary metaphors, exasperated disbelief, Gordon Ramsay energy',
};

function buildPrompt(comment, tone, intensity, vulgarity) {
  const toneDesc      = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.witty;
  const intensityDesc = ['barely a flick', 'a light jab', 'a solid hit', 'a devastating blow', 'an absolute nuclear annihilation'][intensity - 1];
  const vulgarityDesc = vulgarity <= 1 ? 'completely clean, no profanity'
    : vulgarity === 2 ? 'mild — one or two soft words at most'
    : vulgarity === 3 ? 'moderate profanity is fine'
    : vulgarity === 4 ? 'strong profanity encouraged'
    : 'absolutely no filter, explicit language fully unleashed';

  return `You are the world's greatest comeback artist. Generate a single perfect comeback response to the following comment.

The comment received: "${comment}"

Requirements:
- Tone: ${toneDesc}
- Intensity: ${intensityDesc} (intensity level ${intensity}/5)
- Language/Vulgarity: ${vulgarityDesc} (level ${vulgarity}/5)

Rules:
- Output ONLY the comeback itself — no explanations, no preamble, no quotes around it
- Make it feel natural and conversational, not like a monologue
- It should be punchy: 1–3 sentences max
- The comeback should be specifically targeted at what was said, not generic
- Make it memorable and satisfying`;
}

export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'API key not configured.' }, { status: 500, headers: CORS_HEADERS });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400, headers: CORS_HEADERS });
  }

  const { comment, tone, intensity, vulgarity } = body;

  if (!comment || !comment.trim()) {
    return Response.json({ error: 'Comment is required.' }, { status: 400, headers: CORS_HEADERS });
  }

  const clampedIntensity = Math.min(5, Math.max(1, parseInt(intensity) || 3));
  const clampedVulgarity = Math.min(5, Math.max(1, parseInt(vulgarity) || 1));

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: buildPrompt(comment, tone, clampedIntensity, clampedVulgarity) }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return Response.json(
      { error: err?.error?.message || 'Anthropic API error.' },
      { status: 502, headers: CORS_HEADERS }
    );
  }

  const data    = await anthropicRes.json();
  const comeback = data.content[0].text.trim();
  return Response.json({ comeback }, { headers: CORS_HEADERS });
}
