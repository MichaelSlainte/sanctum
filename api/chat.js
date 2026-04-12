const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  const { messages, system } = req.body;

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system,
      messages,
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req2 = https.request(options, (r2) => {
      let data = "";
      r2.on("data", (chunk) => { data += chunk; });
      r2.on("end", () => {
        res.status(r2.statusCode).json(JSON.parse(data));
        resolve();
      });
    });

    req2.on("error", (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    req2.write(payload);
    req2.end();
  });
};