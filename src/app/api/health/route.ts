import { streamingEnabled } from "@/lib/anthropic";
import { DATA_VERSION, MODELS } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ claude: Boolean(process.env.ANTHROPIC_API_KEY), streaming: streamingEnabled(), version: DATA_VERSION, models: MODELS.length });
}
