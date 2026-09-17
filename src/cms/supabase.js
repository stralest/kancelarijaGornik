import { createClient } from "@supabase/supabase-js";
import { isPublicKey } from "./public-config";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Only this lazy-loaded admin module persists an Auth session. No passwords are stored.
function configuredClient() {
  if (!url || !isPublicKey(key)) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    return createClient(parsed.href, key);
  } catch {
    return null;
  }
}
export const supabase = configuredClient();

export async function requireAdmin() {
  if (!supabase) throw new Error("configuration");
  const { data: user, error } = await supabase.auth.getUser();
  if (error || !user.user) throw new Error("session");
  const { data: allowed, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || !allowed) throw new Error("unauthorized");
}

export async function cleanupImage(path) {
  if (!path) return true;
  const { error } = await supabase.storage
    .from("article-images")
    .remove([path]);
  return !error;
}
