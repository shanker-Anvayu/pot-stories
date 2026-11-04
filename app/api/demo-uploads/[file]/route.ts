import { readDemoUpload } from "@/lib/server/backend/demo";
import { backendMode } from "@/lib/server/env";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Serves admin uploads stored by the local demo backend (.data/uploads). */
export async function GET(_req: Request, ctx: RouteContext<"/api/demo-uploads/[file]">) {
  if (backendMode() !== "demo") return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const type = CONTENT_TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });
  const data = await readDemoUpload(file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
