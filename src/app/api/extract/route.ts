import { extractText, getDocumentProxy } from "unpdf";
export const dynamic = "force-dynamic";
const MAX = 4 * 1024 * 1024;
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "no file" }, { status: 400 });
    if (file.size > MAX) return Response.json({ error: "file too large (4 MB max)" }, { status: 413 });
    const buf = new Uint8Array(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(buf);
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      return Response.json({ text: String(text).replace(/\s+/g, " ").slice(0, 20000), pages: totalPages });
    }
    const text = new TextDecoder().decode(buf);
    return Response.json({ text: text.slice(0, 20000), pages: 1 });
  } catch (e) {
    return Response.json({ error: "could not read that file", detail: String(e) }, { status: 422 });
  }
}
