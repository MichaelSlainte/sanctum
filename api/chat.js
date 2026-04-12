export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "API key not configured" });
  }

  console.log("API key found, length:", apiKey.length);

  try {
    const body = req.body;
    console.log("Request body keys:", Object.keys(body || {}));

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = await r.json();
    console.log("Anthropic response status:", r.status);
    if (!r.ok) console.error("Anthropic error:", JSON.stringify(data));
    
    return res.status(r.status).json(data);

  } catch (err) {
    console.error("Caught error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}