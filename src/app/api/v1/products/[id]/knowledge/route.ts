import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { fail, handleError, ok } from "@/lib/api/responses";
import { requireProduct } from "@/lib/products/repository";
import { ingestDocument, listSources } from "@/lib/rag/ingest";
import { loadMarkdown, loadPdf, loadUrl, typeFromFilename } from "@/lib/rag/loaders";
import { retrieve } from "@/lib/rag/retriever";

type Params = { params: Promise<{ id: string }> };
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    requireProduct(id);
    const q = req.nextUrl.searchParams.get("q");
    if (q) return ok({ results: await retrieve(id, q, { topK: 8 }) });
    return ok({ sources: listSources(id) });
  } catch (err) { return handleError(err); }
}

/**
 * Accepts either multipart/form-data (file upload: pdf/md/txt) or JSON:
 *   { type: "text" | "markdown", title, text }  |  { type: "url", url }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    requireProduct(id);
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail("validation_error", "file is required", 400);
      if (file.size > MAX_UPLOAD_BYTES) return fail("too_large", "File exceeds 15 MB", 413);
      const buffer = Buffer.from(await file.arrayBuffer());
      const type = typeFromFilename(file.name);
      const doc = type === "pdf" ? await loadPdf(buffer, file.name) : loadMarkdown(buffer.toString("utf8"), file.name);
      const title = (form.get("title") as string | null) || doc.title;
      const source = await ingestDocument({ productId: id, type, title, text: doc.text, reference: doc.reference });
      return ok({ source }, { status: 201 });
    }

    const body = z.discriminatedUnion("type", [
      z.object({ type: z.enum(["text", "markdown"]), title: z.string().min(1), text: z.string().min(1) }),
      z.object({ type: z.literal("url"), url: z.string().url(), title: z.string().optional() }),
    ]).parse(await req.json());

    if (body.type === "url") {
      const doc = await loadUrl(body.url);
      const source = await ingestDocument({ productId: id, type: "url", title: body.title ?? doc.title, text: doc.text, reference: body.url });
      return ok({ source }, { status: 201 });
    }
    const source = await ingestDocument({ productId: id, type: body.type, title: body.title, text: body.text });
    return ok({ source }, { status: 201 });
  } catch (err) { return handleError(err); }
}
