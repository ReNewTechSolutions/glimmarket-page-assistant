import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { fetchPageById } from "./wp.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const {
  PORT = "4000",
  OPENAI_API_KEY,
  WP_BASE,
  ALLOWED_ORIGINS = "",
  MODEL = "gpt-4o-mini", 
} = process.env;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!WP_BASE) throw new Error("Missing WP_BASE");

const allowlist = ALLOWED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl/server-to-server
      if (allowlist.length === 0) return cb(null, true); // allow all if not set
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// tiny in-memory cache (10 min TTL)
const pageCache = new Map(); // pageId -> { title, link, text, ts }

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { pageId, messages } = req.body || {};

    if (!pageId) return res.status(400).json({ error: "pageId required" });
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] required" });
    }

    // fetch + cache page text
    let page = pageCache.get(pageId);
    const ttlMs = 10 * 60 * 1000;

    if (!page || Date.now() - page.ts > ttlMs) {
      const fresh = await fetchPageById({ wpBase: WP_BASE, pageId });
      page = { ...fresh, ts: Date.now() };
      pageCache.set(pageId, page);
    }

    // keep page content bounded
    const pageText = (page.text || "").slice(0, 14000);

    const system = `
You are GlimMarket's Page Assistant.
Use ONLY the provided page content.
You can: summarize the page, produce key takeaways, and answer questions about the page.
If the page does not contain the answer, say: "This page doesn’t cover that."

Style rules:
- Summaries: 2–3 sentences unless user asks for more.
- Key takeaways: 3–7 bullet points.
- Add: "Educational only — not financial advice." at the end.

Page title: ${page.title}
Page URL: ${page.link}
`.trim();

    const response = await client.responses.create({
      model: MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: `PAGE CONTENT:\n${pageText}` },
        ...messages,
      ],
    });

    const out = response.output?.[0]?.content || [];
    const answer = out
      .filter((b) => b.type === "output_text")
      .map((b) => b.text)
      .join("")
      .trim();

    return res.json({
      answer,
      pageMeta: {
        id: pageId,
        title: page.title,
        url: page.link,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "server_error",
      details: String(e?.message || e),
    });
  }
});

app.listen(Number(PORT), () => {
  console.log(`Backend listening on :${PORT}`);
});