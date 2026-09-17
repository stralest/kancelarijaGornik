// Explicit allowlist renderer: stored JSON never becomes arbitrary HTML.
export const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function safeLink(value) {
  if (
    typeof value !== "string" ||
    [...value].some((c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  )
    return null;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function renderContent(doc) {
  let count = 0;
  function node(n, depth = 0) {
    if (!n || typeof n !== "object" || depth > 30 || ++count > 20000) return "";
    if (n.type === "text") {
      let text = escapeHtml(typeof n.text === "string" ? n.text : "");
      for (const mark of Array.isArray(n.marks) ? n.marks.slice(0, 8) : []) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "link") {
          const href = safeLink(mark.attrs?.href);
          if (href)
            text = `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${text}</a>`;
        }
      }
      return text;
    }
    if (n.type === "hardBreak") return "<br />";
    const tags = {
      paragraph: "p",
      bulletList: "ul",
      orderedList: "ol",
      listItem: "li",
      heading: n.attrs?.level === 3 ? "h3" : "h2",
    };
    if (n.type !== "doc" && !Object.hasOwn(tags, n.type)) return "";
    const children = (Array.isArray(n.content) ? n.content : [])
      .map((c) => node(c, depth + 1))
      .join("");
    return n.type === "doc"
      ? children
      : `<${tags[n.type]}>${children}</${tags[n.type]}>`;
  }
  return node(doc);
}
export function contentText(doc) {
  return renderContent(doc)
    .replace(/<[^>]*>/g, "")
    .trim();
}
export function slugify(title) {
  const cyrillic = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    ђ: "dj",
    е: "e",
    ж: "z",
    з: "z",
    и: "i",
    ј: "j",
    к: "k",
    л: "l",
    љ: "lj",
    м: "m",
    н: "n",
    њ: "nj",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    ћ: "c",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "c",
    џ: "dz",
    ш: "s",
  };
  return title
    .toLowerCase()
    .replace(/[а-яђјљњћџ]/g, (c) => cyrillic[c] || c)
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160)
    .replace(/-$/, "");
}
export function localizedArticle(article, language) {
  const locale = language === "en" && article.title_en ? "en" : "sr";
  return {
    ...article,
    locale,
    title: article[`title_${locale}`],
    excerpt: article[`excerpt_${locale}`],
    content: article[`content_${locale}`],
    image_alt: article[`image_alt_${locale}`] || "",
  };
}
export const imageUrl = (path) => `/api/cms?image=${encodeURIComponent(path)}`;
export const defaultArticleImage = "/article-default.jpg";
export const emptyContent = () => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
