import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5";

export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ timeout: 25_000, maxRetries: 1 });
}

export const streamingEnabled = () => process.env.STREAMING !== "off";

/** Turn a Claude message stream into a text/plain streamed Response, or a JSON body when streaming is off. On error, append the fallback text. */
export async function streamResponse(stream: ReturnType<Anthropic["messages"]["stream"]>, fallback: string): Promise<Response> {
  if (!streamingEnabled()) {
    try {
      const msg = await stream.finalMessage();
      const text = (msg.content as { type: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text || "").join("");
      return Response.json({ mode: "claude", text: text || fallback });
    } catch {
      return Response.json({ mode: "template", text: fallback });
    }
  }
  const enc = new TextEncoder();
  return new Response(new ReadableStream({
    async start(c) {
      let wrote = false;
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") { c.enqueue(enc.encode(ev.delta.text)); wrote = true; }
        }
      } catch {
        if (wrote) c.enqueue(enc.encode("\n\n" + fallback));
        else c.enqueue(enc.encode(JSON.stringify({ mode: "template", text: fallback })));
      } finally { c.close(); }
    },
  }), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Mode": "claude" } });
}
