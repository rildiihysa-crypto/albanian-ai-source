import { createFileRoute } from "@tanstack/react-router";

const ZERI = "https://berry-forest-velvet-zippy.grok.me";

export const Route = createFileRoute("/api/zeri-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json().catch(() => ({}))) as { text?: string; lang?: string };
          const text = String(payload.text || "").replace(/\s+/g, " ").trim().slice(0, 1400);
          if (!text) return Response.json({ audioBase64: null });
          const res = await fetch(`${ZERI}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
            body: JSON.stringify({
              text,
              voice_id: "sal",
              language: payload.lang === "en" ? "en" : "auto",
              speed: 1,
            }),
            signal: AbortSignal.timeout(25_000),
          });
          if (!res.ok) return Response.json({ audioBase64: null });
          const audio = Buffer.from(await res.arrayBuffer());
          if (audio.length < 200) return Response.json({ audioBase64: null });
          return Response.json({ audioBase64: audio.toString("base64"), mime: "audio/mpeg" });
        } catch {
          return Response.json({ audioBase64: null });
        }
      },
    },
  },
});
