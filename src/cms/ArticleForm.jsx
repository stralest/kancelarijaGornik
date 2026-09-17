import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-context";
import { emptyContent, contentText, slugify } from "./content";
import { supabase, requireAdmin, cleanupImage } from "./supabase";
import { optimizeImage, uploadImage } from "./images";
import { ArticleView } from "./PublicArticles";
import Editor from "./Editor";

export default function ArticleForm({ article, categories, onClose, onSaved }) {
  const {
    t: { cms: c },
  } = useLanguage();
  const [form, setForm] = useState(
    () =>
      article || {
        id: crypto.randomUUID(),
        title_sr: "",
        slug: "",
        excerpt_sr: "",
        content_sr: emptyContent(),
        title_en: null,
        excerpt_en: null,
        content_en: null,
        category_id: "",
        featured_image_path: null,
        image_alt_sr: "",
        image_alt_en: "",
        author: "Advokatska kancelarija Gornik",
        status: "draft",
      },
  );
  const [manualSlug, setManualSlug] = useState(!!article);
  const [english, setEnglish] = useState(!!article?.title_en);
  const [dirty, setDirty] = useState(false);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    if (!blob) return;
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [blob, previewUrl]);
  useEffect(() => {
    if (blob || !form.featured_image_path) return;
    let active = true;
    async function refresh() {
      const { data, error } = await supabase.storage
        .from("article-images")
        .createSignedUrl(form.featured_image_path, 60);
      if (active && !error) setPreviewUrl(data.signedUrl);
    }
    refresh();
    const timer = setInterval(refresh, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [form.featured_image_path, blob]);

  async function chooseImage(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const optimized = await optimizeImage(file);
      setBlob(optimized);
      setPreviewUrl(URL.createObjectURL(optimized));
      setDirty(true);
    } catch {
      setMessage(c.uploadFailed);
    } finally {
      setBusy(false);
    }
  }
  async function save(status) {
    if (busy) return;
    if (
      !form.title_sr.trim() ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug) ||
      !form.category_id ||
      (status === "published" &&
        (!form.excerpt_sr.trim() || !contentText(form.content_sr))) ||
      (english &&
        (!form.title_en?.trim() ||
          !form.excerpt_en?.trim() ||
          !contentText(form.content_en)))
    ) {
      setMessage(c.invalid);
      return;
    }
    setBusy(true);
    setMessage("");
    let uploaded;
    try {
      await requireAdmin();
      if (blob) uploaded = await uploadImage(form.id, blob);
      const payload = {
        ...form,
        status,
        featured_image_path: uploaded || form.featured_image_path,
        title_en: english ? form.title_en : null,
        excerpt_en: english ? form.excerpt_en : null,
        content_en: english ? form.content_en : null,
      };
      delete payload.categories;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.published_at;
      // Optimistic concurrency prevents two open tabs silently overwriting work.
      const query = article
        ? supabase
            .from("articles")
            .update(payload)
            .eq("id", article.id)
            .eq("updated_at", article.updated_at)
        : supabase.from("articles").insert(payload);
      const { data, error } = await query.select("id").single();
      if (error || !data) throw error || new Error("save");
      const oldPath = article?.featured_image_path;
      const cleaned =
        !oldPath ||
        oldPath === payload.featured_image_path ||
        (await cleanupImage(oldPath));
      setDirty(false);
      onSaved(cleaned ? c.saved : c.cleanupFailed);
    } catch (error) {
      if (uploaded) await cleanupImage(uploaded); // RLS retains it if the write actually committed.
      setMessage(
        error?.code === "23505"
          ? c.duplicate
          : error?.message === "upload"
            ? c.uploadFailed
            : c.saveFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (!dirty || window.confirm(c.discard)) onClose();
  }
  const current = {
    ...form,
    categories: categories.find((cat) => cat.id === form.category_id),
    title_en: english ? form.title_en : null,
    content_en: english ? form.content_en : null,
  };
  return (
    <>
      <div className="cms-actions">
        <h1>{article ? c.edit : c.newArticle}</h1>
        <button
          className="cms-button secondary"
          disabled={busy}
          onClick={close}
        >
          {c.cancel}
        </button>
      </div>
      {message && (
        <p role="alert" className="cms-notice cms-error">
          {message}
        </p>
      )}
      <form
        className="cms-form"
        onSubmit={(e) => {
          e.preventDefault();
          save(form.status);
        }}
      >
        <fieldset disabled={busy}>
          <legend>{c.articles}</legend>
          <label>
            {c.slug}
            <input
              required
              maxLength={160}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={(e) => {
                setManualSlug(true);
                update({ slug: e.target.value });
              }}
            />
            <small>{c.slugHelp}</small>
          </label>
          <label>
            {c.category}
            <select
              required
              value={form.category_id}
              onChange={(e) => update({ category_id: e.target.value })}
            >
              <option value="">—</option>
              {categories.map((cat) => (
                <option value={cat.id} key={cat.id}>
                  {cat.name_sr} / {cat.name_en}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.author}
            <input
              required
              maxLength={200}
              value={form.author}
              onChange={(e) => update({ author: e.target.value })}
            />
          </label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>{c.serbian}</legend>
          <label>
            {c.title}
            <input
              required
              maxLength={200}
              value={form.title_sr}
              onChange={(e) =>
                update({
                  title_sr: e.target.value,
                  ...(!manualSlug ? { slug: slugify(e.target.value) } : {}),
                })
              }
            />
          </label>
          <label>
            {c.excerpt}
            <textarea
              rows={3}
              maxLength={500}
              value={form.excerpt_sr}
              onChange={(e) => update({ excerpt_sr: e.target.value })}
            />
          </label>
          <div>
            <p>{c.content}</p>
            <Editor
              disabled={busy}
              value={form.content_sr}
              onChange={(content) => update({ content_sr: content })}
              label={`${c.content} — ${c.serbian}`}
            />
          </div>
        </fieldset>
        <label className="cms-checkbox">
          <input
            type="checkbox"
            disabled={busy}
            checked={english}
            onChange={(e) => {
              setEnglish(e.target.checked);
              setDirty(true);
            }}
          />
          {c.englishVersion}
        </label>
        {english && (
          <fieldset disabled={busy}>
            <legend>{c.english}</legend>
            <p>{c.manualOnly}</p>
            <label>
              {c.title}
              <input
                required
                maxLength={200}
                value={form.title_en || ""}
                onChange={(e) => update({ title_en: e.target.value })}
              />
            </label>
            <label>
              {c.excerpt}
              <textarea
                required
                maxLength={500}
                rows={3}
                value={form.excerpt_en || ""}
                onChange={(e) => update({ excerpt_en: e.target.value })}
              />
            </label>
            <div>
              <p>{c.content}</p>
              <Editor
                disabled={busy}
                value={form.content_en || emptyContent()}
                onChange={(content) => update({ content_en: content })}
                label={`${c.content} — ${c.english}`}
              />
            </div>
          </fieldset>
        )}
        <fieldset disabled={busy}>
          <legend>{c.image}</legend>
          <label>
            {c.image}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseImage}
            />
            <small>{c.imageHelp}</small>
          </label>
          {previewUrl && (
            <img className="cms-image-preview" src={previewUrl} alt="" />
          )}
          {(blob || form.featured_image_path) && (
            <button
              className="cms-button secondary"
              type="button"
              onClick={() => {
                setBlob(null);
                setPreviewUrl("");
                update({ featured_image_path: null });
              }}
            >
              {c.removeImage}
            </button>
          )}
          <label>
            {c.imageAlt} — {c.serbian}
            <input
              maxLength={300}
              value={form.image_alt_sr}
              onChange={(e) => update({ image_alt_sr: e.target.value })}
            />
          </label>
          {english && (
            <label>
              {c.imageAlt} — {c.english}
              <input
                maxLength={300}
                value={form.image_alt_en}
                onChange={(e) => update({ image_alt_en: e.target.value })}
              />
            </label>
          )}
        </fieldset>
        <div className="cms-actions">
          <button
            className="cms-button secondary"
            type="button"
            disabled={busy}
            onClick={() => setPreview(!preview)}
          >
            {preview ? c.closePreview : c.preview}
          </button>
          <button
            className="cms-button secondary"
            type="button"
            disabled={busy}
            onClick={() => save("draft")}
          >
            {form.status === "published" ? c.unpublish : c.saveDraft}
          </button>
          <button
            className="cms-button"
            type="button"
            disabled={busy}
            onClick={() => save("published")}
          >
            {busy ? c.saving : form.status === "published" ? c.save : c.publish}
          </button>
        </div>
      </form>
      {preview && (
        <section className="cms-preview" aria-label={c.preview}>
          <p className="cms-notice">{c.previewNote}</p>
          <ArticleView article={current} previewUrl={previewUrl} />
        </section>
      )}
    </>
  );
}
