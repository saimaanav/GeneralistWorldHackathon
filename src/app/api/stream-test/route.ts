export const dynamic = "force-dynamic";
export async function GET() {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({
    async start(c) {
      for (let i = 1; i <= 3; i++) { c.enqueue(enc.encode(`tick ${i} ${new Date().toISOString()}\n`)); await new Promise((r) => setTimeout(r, 700)); }
      c.close();
    },
  }), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
