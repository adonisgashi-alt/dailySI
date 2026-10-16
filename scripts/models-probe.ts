// Manual check that GitHub Models (free, rate-limited) works from Actions.
// Run by .github/workflows/models-probe.yml.
export {};

const token = process.env.GITHUB_TOKEN;
for (const model of (process.env.MODELS ?? "openai/gpt-4.1-mini openai/gpt-4o-mini meta/llama-3.3-70b-instruct").split(/\s+/)) {
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Reply with JSON only." },
        { role: "user", content: 'Return {"ok": true, "model": "<your name>"}' },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    }),
  });
  const limits = [...res.headers].filter(([k]) => /ratelimit|retry/i.test(k)).map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`== ${model}: ${res.status} ${limits}`);
  console.log((await res.text()).slice(0, 400));
}
