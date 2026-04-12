export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API key not configured" });
    }

    try {
        const { messages, system } = req.body;

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system: systemPrompt,
                messages: [
                    ...messages.map(m => ({ role: m.role, content: m.text })),
                    { role: "user", content: userMsg }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || "API error" });
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Server error: " + err.message });
    }
}