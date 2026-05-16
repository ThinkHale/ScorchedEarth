require("dotenv").config();
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const TONE_DESCRIPTIONS = {
  // Free tones
  witty:         "clever and quick-witted, using wordplay and intelligence",
  sarcastic:     "dripping with sarcasm and irony",
  savage:        "brutally direct and cutting, no mercy",
  deadpan:       "completely dry and emotionless, matter-of-fact",
  "valley-girl": "using valley girl slang, like totally dismissive",
  corporate:     "using passive-aggressive corporate speak and buzzwords",
  // Premium tones
  shakespearean: "in flowery Shakespearean English with thees and thous",
  southern:      "with Southern charm that barely conceals the venom — honeyed words with a steel blade underneath",
  brimstone:     "as a fire-and-brimstone preacher delivering righteous condemnation — biblical fury, Old Testament wrath, and righteous indignation at their sheer audacity",
  therapist:     "as a passive-aggressive therapist — weaponized empathy, clinical language, and feigned concern that makes the roast land harder than any direct insult ever could",
  chef:          "with the furious passion of an elite chef who has been served something disgraceful — culinary metaphors, exasperated disbelief, Gordon Ramsay energy",
};

function buildPrompt(comment, tone, intensity, vulgarity) {
  const toneDesc = TONE_DESCRIPTIONS[tone] || "witty";
  const intensityDesc = ["barely a flick", "a light jab", "a solid hit", "a devastating blow", "an absolute nuclear annihilation"][intensity - 1];
  const vulgarityDesc = vulgarity <= 1
    ? "completely clean, no profanity"
    : vulgarity === 2
    ? "mild — one or two soft words at most"
    : vulgarity === 3
    ? "moderate profanity is fine"
    : vulgarity === 4
    ? "strong profanity encouraged"
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

app.post("/api/comeback", async (req, res) => {
  const { comment, tone, intensity, vulgarity } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "Comment is required" });
  }

  const clampedIntensity = Math.min(5, Math.max(1, parseInt(intensity) || 3));
  const clampedVulgarity = Math.min(5, Math.max(1, parseInt(vulgarity) || 1));

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: buildPrompt(comment, tone, clampedIntensity, clampedVulgarity),
        },
      ],
    });

    const comeback = message.content[0].text.trim();
    res.json({ comeback });
  } catch (err) {
    console.error("Anthropic API error:", err.message);
    res.status(500).json({ error: "Failed to generate comeback. Check your API key." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scorched Earth running on http://localhost:${PORT}`);
});
