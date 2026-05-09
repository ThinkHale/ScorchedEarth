const TONE_DESCRIPTIONS = {
  witty:         "clever and quick-witted, using wordplay and intelligence",
  sarcastic:     "dripping with sarcasm and irony",
  savage:        "brutally direct and cutting, no mercy",
  deadpan:       "completely dry and emotionless, matter-of-fact",
  shakespearean: "in flowery Shakespearean English with thees and thous",
  "valley-girl": "using valley girl slang, like totally dismissive",
  southern:      "with Southern charm that barely conceals the venom",
  corporate:     "using passive-aggressive corporate speak and buzzwords",
};

function buildPrompt(comment, tone, intensity, vulgarity) {
  const toneDesc      = TONE_DESCRIPTIONS[tone] || "witty";
  const intensityDesc = ["barely a flick", "a light jab", "a solid hit", "a devastating blow", "an absolute nuclear annihilation"][intensity - 1];
  const vulgarityDesc = vulgarity <= 1 ? "completely clean, no profanity"
    : vulgarity === 2 ? "mild — one or two soft words at most"
    : vulgarity === 3 ? "moderate profanity is fine"
    : vulgarity === 4 ? "strong profanity encouraged"
    : "absolutely no filter, explicit language fully unleashed";

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

export async function onRequestPost(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured." }, { status: 500 });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { comment, tone, intensity, vulgarity } = body;

  if (!comment || !comment.trim()) {
    return Response.json({ error: "Comment is required." }, { status: 400 });
  }

  const clampedIntensity = Math.min(5, Math.max(1, parseInt(intensity) || 3));
  const clampedVulgarity = Math.min(5, Math.max(1, parseInt(vulgarity) || 1));

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: buildPrompt(comment, tone, clampedIntensity, clampedVulgarity) }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return Response.json({ error: err?.error?.message || "Anthropic API error." }, { status: 502 });
  }

  const data = await anthropicRes.json();
  const comeback = data.content[0].text.trim();
  return Response.json({ comeback });
}

// Block all non-POST methods
export function onRequest() {
  return new Response("Method Not Allowed", { status: 405 });
}
