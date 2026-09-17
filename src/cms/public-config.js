export function isPublicKey(key) {
  if (typeof key !== "string") return false;
  if (key.startsWith("sb_publishable_")) return true;
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role === "anon";
  } catch {
    return false;
  }
}
