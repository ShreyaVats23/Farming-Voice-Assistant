import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

function sanitizePrompt(s){ return String(s || "").slice(0, 2000); }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const SYSTEM = "You are a helpful farming assistant. Answer in the language, the user asks the question in. Answer in 1-3 sentences, under 40 words.";


app.post("/ask", async (req, res) => {
  try {
    const prompt = sanitizePrompt(req.body?.prompt);
    const result = await model.generateContent(`${SYSTEM}\n\nUser: ${prompt}`);
    res.json({ text: result.response.text() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gemini error" });
  }
});

app.post("/ask-stream", async (req, res) => {
  try {
    const prompt = sanitizePrompt(req.body?.prompt);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: `${SYSTEM}\n\nUser: ${prompt}` }] }],
    });

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).end("Streaming error");
    else res.end();
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("Proxy running on", PORT));
// To run: set GEMINI_API_KEY=your_key_here && node server.js
