import { streamingEnabled } from "@/lib/anthropic";
import { DATA_VERSION, MODELS } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ claude: Boolean(process.env.ANTHROPIC_API_KEY), key_source: process.env.ANTHROPIC_API_KEY ? (process.env.ANTHROPIC_BASE_URL ? "netlify_gateway" : "own_key") : "none", streaming: streamingEnabled(), version: DATA_VERSION, models: MODELS.length });
}
