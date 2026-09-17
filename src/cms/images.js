import { supabase, requireAdmin } from "./supabase";

export function detectImage(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function optimizeImage(file) {
  if (!file || file.size > 10 * 1024 * 1024 || !file.size)
    throw new Error("upload");
  const type = detectImage(
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
  );
  if (!type || type !== file.type) throw new Error("upload");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error("upload");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Decode and re-encode: source metadata and active content are not retained.
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!blob || blob.type !== "image/webp" || blob.size > 2 * 1024 * 1024)
      throw new Error("upload");
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function uploadImage(id, blob) {
  await requireAdmin();
  const path = `${id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("article-images")
    .upload(path, blob, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "0",
    });
  if (error) throw new Error("upload");
  return path;
}

export async function cleanupUnusedImages() {
  await requireAdmin();
  // Paginate before deleting so offsets cannot skip files. Only older uploads
  // are eligible; a concurrent editor's pending upload is left alone.
  async function listAll(prefix) {
    const all = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage
        .from("article-images")
        .list(prefix, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw error;
      all.push(...data);
      if (data.length < 100) return all;
    }
  }
  const { data: articles, error } = await supabase
    .from("articles")
    .select("featured_image_path");
  if (error) throw error;
  const used = new Set(articles.map((a) => a.featured_image_path));
  for (const folder of await listAll("")) {
    if (folder.id) continue;
    for (const file of await listAll(folder.name)) {
      const path = `${folder.name}/${file.name}`;
      if (
        !used.has(path) &&
        Date.now() - new Date(file.created_at).getTime() > 86400000
      ) {
        // RLS independently blocks deletion if another save referenced it meanwhile.
        const { error: deletionError } = await supabase.storage
          .from("article-images")
          .remove([path]);
        if (deletionError) throw deletionError;
      }
    }
  }
}
