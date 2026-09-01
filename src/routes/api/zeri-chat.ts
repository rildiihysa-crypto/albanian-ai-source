import { createFileRoute } from "@tanstack/react-router";

const ZERI = "https://berry-forest-velvet-zippy.grok.me";

export const Route = createFileRoute("/api/zeri-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json().catch(() => ({}))) as {
            messages?: { role?: string; text?: string; content?: string }[];
            lang?: string;
          };
          const messages = (payload.messages || [])
            .map((row) => ({
              role: row.role === "assistant" ? "assistant" : "user",
              text: String(row.text || row.content || "").trim(),
            }))
            .filter((row) => row.text)
            .slice(-12);
          if (!messages.length) return Response.json({ text: "" });
          const res = await fetch(`${ZERI}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
            body: JSON.stringify({ messages, lang: payload.lang === "en" || payload.lang === "it" ? payload.lang : "sq" }),
            signal: AbortSignal.timeout(45_000),
          });
          if (!res.ok || !res.body) return Response.json({ text: "" });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let text = "";
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const raw = line.replace(/^data:\s*/, "").trim();
              if (!raw || raw === "[DONE]") continue;
              try {
                const json = JSON.parse(raw) as { delta?: string; text?: string };
                const piece = String(json.delta || json.text || "").replace("<|eos|>", "");
                text += piece;
              } catch {
                text += raw.replace("<|eos|>", "");
              }
            }
          }
          return Response.json({ text: text.replace(/\s+/g, " ").trim() });
        } catch {
          return Response.json({ text: "" });
        }
      },
    },
  },
});
