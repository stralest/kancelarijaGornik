import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-context";
import {
  defaultArticleImage,
  imageUrl,
  localizedArticle,
  renderContent,
} from "./content";

export function ArticleImage({ path, alt = "", previewUrl, eager = false }) {
  const [failed, setFailed] = useState(false);
  const custom = previewUrl || (path && imageUrl(path));
  return (
    <img
      className="article-image"
      src={custom && !failed ? custom : defaultArticleImage}
      alt={custom && !failed ? alt : "Advokatska kancelarija Gornik"}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        if (custom) setFailed(true);
      }}
    />
  );
}

export function ArticleView({ article, previewUrl }) {
  const {
    language,
    t: { cms: c },
  } = useLanguage();
  const a = localizedArticle(article, language);
  const date = (value) =>
    new Date(value).toLocaleDateString(
      language === "en" ? "en-GB" : "sr-Latn-RS",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Belgrade",
      },
    );
  return (
    <article className="article-detail">
      {language !== a.locale && <p className="cms-notice">{c.fallback}</p>}
      <p className="article-category">
        {article.categories?.[`name_${language}`]}
      </p>
      <h1 lang={a.locale}>{a.title}</h1>
      <div className="article-meta">
        <span>
          {c.author}: {a.author}
        </span>
        {a.published_at && (
          <span>
            {c.publishedAt}:{" "}
            <time dateTime={a.published_at}>{date(a.published_at)}</time>
          </span>
        )}
        {a.published_at &&
          new Date(a.updated_at) - new Date(a.published_at) > 60000 && (
            <span>
              {c.updatedAt}:{" "}
              <time dateTime={a.updated_at}>{date(a.updated_at)}</time>
            </span>
          )}
      </div>
      <ArticleImage
        key={previewUrl || a.featured_image_path}
        path={a.featured_image_path}
        previewUrl={previewUrl}
        alt={a.image_alt}
        eager
      />
      <div
        lang={a.locale}
        className="article-prose"
        dangerouslySetInnerHTML={{ __html: renderContent(a.content) }}
      />
    </article>
  );
}

export default function PublicArticles({ initialData, path }) {
  const {
    language,
    t: { cms: c },
  } = useLanguage();
  const [data, setData] = useState(initialData);
  const [category, setCategory] = useState("");
  useEffect(() => {
    if (initialData) return;
    const controller = new AbortController();
    fetch(`/api/cms?data=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok && res.status !== 404) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch((error) => {
        if (error.name !== "AbortError") setData({ error: true });
      });
    return () => controller.abort();
  }, [initialData, path]);
  useEffect(() => {
    const title = data?.article
      ? localizedArticle(data.article, language).title
      : c.insights;
    document.title = `${title} | Advokatska kancelarija Gornik`;
  }, [data, language, c.insights]);
  if (!data) return <p role="status">{c.loading}</p>;
  if (data.error)
    return (
      <div role="alert">
        <h1>{c.insights}</h1>
        <p>{c.unavailable}</p>
        <a className="cms-button" href={path}>
          {c.retry}
        </a>
      </div>
    );
  if (data.notFound)
    return (
      <>
        <h1>{c.notFound}</h1>
        <a className="cms-button" href="/clanci">
          {c.back}
        </a>
      </>
    );
  if (data.article)
    return (
      <>
        <a className="cms-back" href="/clanci">
          ← {c.back}
        </a>
        <ArticleView article={data.article} />
      </>
    );
  const articles = (data.articles || []).filter(
    (a) => !category || a.category_id === category,
  );
  return (
    <>
      <header className="insights-heading">
        <p className="article-category">Advokatska kancelarija Gornik</p>
        <h1 className="section-title">{c.insights}</h1>
        <p>{c.intro}</p>
      </header>
      <label className="cms-filter">
        {c.category}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{c.all}</option>
          {data.categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat[`name_${language}`]}
            </option>
          ))}
        </select>
      </label>
      {!articles.length && (
        <p role="status" className="cms-notice">
          {category ? c.emptyCategory : c.empty}
        </p>
      )}
      <div className="article-grid">
        {articles.map((article) => {
          const a = localizedArticle(article, language);
          return (
            <article className="article-card" key={a.id}>
              <ArticleImage path={a.featured_image_path} alt={a.image_alt} />
              <div className="article-card-body">
                <p className="article-category">
                  {a.categories?.[`name_${language}`]}
                </p>
                <h2 lang={a.locale}>
                  <a href={`/clanci/${a.slug}`}>{a.title}</a>
                </h2>
                <time dateTime={a.published_at}>
                  {new Date(a.published_at).toLocaleDateString(
                    language === "en" ? "en-GB" : "sr-Latn-RS",
                    { timeZone: "Europe/Belgrade" },
                  )}
                </time>
                <p lang={a.locale}>{a.excerpt}</p>
                {language !== a.locale && <small>{c.fallback}</small>}
                <a className="cms-read-more" href={`/clanci/${a.slug}`}>
                  {c.readMore} →<span className="cms-sr-only">: {a.title}</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
