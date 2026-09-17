import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-context";
import { supabase, requireAdmin, cleanupImage } from "./supabase";
import { cleanupUnusedImages } from "./images";
import ArticleForm from "./ArticleForm";

function Categories({ categories, refresh, report, busy, run }) {
  const {
    t: { cms: c },
  } = useLanguage();
  async function save(event, id) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      name_sr: fields.get("name_sr").trim(),
      name_en: fields.get("name_en").trim(),
    };
    await run(async () => {
      const query = id
        ? supabase.from("categories").update(payload).eq("id", id)
        : supabase.from("categories").insert(payload);
      const { error } = await query.select("id").single();
      if (error) {
        report(c.categoryFailed);
        return;
      }
      if (!id) form.reset();
      await refresh();
    });
  }
  return (
    <section className="cms-categories">
      <h2>{c.categories}</h2>
      {[...categories, { id: "", name_sr: "", name_en: "" }].map((cat) => (
        <form
          className="cms-category-row"
          key={`${cat.id}-${cat.name_sr}-${cat.name_en}`}
          onSubmit={(e) => save(e, cat.id)}
        >
          <label>
            {cat.id ? c.nameSr : `${c.newCategory} — ${c.nameSr}`}
            <input
              name="name_sr"
              required
              maxLength={100}
              defaultValue={cat.name_sr}
              disabled={busy}
            />
          </label>
          <label>
            {c.nameEn}
            <input
              name="name_en"
              required
              maxLength={100}
              defaultValue={cat.name_en}
              disabled={busy}
            />
          </label>
          <button className="cms-button secondary" disabled={busy}>
            {c.save}
          </button>
          {cat.id && (
            <button
              className="cms-button danger"
              disabled={busy}
              type="button"
              onClick={() => {
                if (window.confirm(c.categoryConfirm))
                  run(async () => {
                    const { error } = await supabase
                      .from("categories")
                      .delete()
                      .eq("id", cat.id)
                      .select("id")
                      .single();
                    if (error) report(c.categoryDeleteFailed);
                    else await refresh();
                  });
              }}
            >
              {c.delete}
            </button>
          )}
        </form>
      ))}
    </section>
  );
}

function Dashboard({ logout }) {
  const {
    language,
    t: { cms: c },
  } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    const [a, cats] = await Promise.all([
      supabase
        .from("articles")
        .select("*,categories(*)")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name_sr"),
    ]);
    if (a.error || cats.error) throw new Error("load");
    setArticles(a.data);
    setCategories(cats.data);
    setLoaded(true);
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from("articles")
        .select("*,categories(*)")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name_sr"),
    ])
      .then(([a, cats]) => {
        if (!active) return;
        if (a.error || cats.error) {
          setMessage(c.operationFailed);
          return;
        }
        setArticles(a.data);
        setCategories(cats.data);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setMessage(c.operationFailed);
      });
    return () => {
      active = false;
    };
  }, [c.operationFailed]);
  async function run(action) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await requireAdmin();
      await action();
    } catch {
      setMessage(c.operationFailed);
    } finally {
      setBusy(false);
    }
  }
  const date = (value) =>
    value
      ? new Date(value).toLocaleDateString(
          language === "en" ? "en-GB" : "sr-Latn-RS",
          { timeZone: "Europe/Belgrade" },
        )
      : "—";
  if (editing !== undefined)
    return (
      <ArticleForm
        key={editing?.id || "new"}
        article={editing}
        categories={categories}
        onClose={() => setEditing(undefined)}
        onSaved={async (notice) => {
          setEditing(undefined);
          setMessage(notice);
          try {
            await refresh();
          } catch {
            setMessage(c.operationFailed);
          }
        }}
      />
    );
  return (
    <>
      <div className="cms-actions">
        <h1>{c.articles}</h1>
        <div className="cms-action-buttons">
          <button
            className="cms-button"
            disabled={!loaded || busy}
            onClick={() => setEditing(null)}
          >
            {c.newArticle}
          </button>
          <button
            className="cms-button secondary"
            disabled={busy}
            onClick={logout}
          >
            {c.logout}
          </button>
        </div>
      </div>
      {message && (
        <p className="cms-notice" role="status">
          {message}
        </p>
      )}
      {!loaded && (
        <>
          <p role="status">{c.loading}</p>
          <button
            className="cms-button secondary"
            disabled={busy}
            onClick={() => run(refresh)}
          >
            {c.retry}
          </button>
        </>
      )}
      {loaded && !articles.length && (
        <p className="cms-notice">{c.noAdminArticles}</p>
      )}
      {!!articles.length && (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                {[
                  c.title,
                  c.category,
                  c.status,
                  c.createdAt,
                  c.publishedAt,
                  c.updatedAt,
                  c.edit,
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td>{a.title_sr}</td>
                  <td>{a.categories?.[`name_${language}`]}</td>
                  <td>
                    <span className={`cms-status ${a.status}`}>
                      {c[a.status]}
                    </span>
                  </td>
                  <td>{date(a.created_at)}</td>
                  <td>{date(a.published_at)}</td>
                  <td>{date(a.updated_at)}</td>
                  <td>
                    <div className="cms-actions">
                      <button
                        className="cms-button secondary"
                        disabled={busy}
                        onClick={() => setEditing(a)}
                      >
                        {c.edit} / {c.preview}
                      </button>
                      <button
                        className="cms-button secondary"
                        disabled={busy}
                        onClick={() => {
                          if (a.status === "draft") {
                            setEditing(a);
                            return;
                          }
                          run(async () => {
                            const { error } = await supabase
                              .from("articles")
                              .update({ status: "draft" })
                              .eq("id", a.id)
                              .eq("updated_at", a.updated_at)
                              .select("id")
                              .single();
                            if (error) throw error;
                            await refresh();
                          });
                        }}
                      >
                        {a.status === "published" ? c.unpublish : c.publish}
                      </button>
                      <button
                        className="cms-button danger"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${c.deleteConfirm}\n\n${a.title_sr}`,
                            )
                          )
                            return;
                          run(async () => {
                            const { error } = await supabase
                              .from("articles")
                              .delete()
                              .eq("id", a.id)
                              .eq("updated_at", a.updated_at)
                              .select("id")
                              .single();
                            if (error) throw error;
                            if (!(await cleanupImage(a.featured_image_path)))
                              setMessage(c.cleanupFailed);
                            await refresh();
                          });
                        }}
                      >
                        {c.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && (
        <Categories
          categories={categories}
          refresh={refresh}
          report={setMessage}
          busy={busy}
          run={run}
        />
      )}
      <div className="cms-actions">
        <button
          className="cms-button secondary"
          disabled={busy}
          onClick={() => {
            if (window.confirm(c.cleanupConfirm))
              run(async () => {
                await cleanupUnusedImages();
                setMessage(c.cleaned);
              });
          }}
        >
          {c.cleanup}
        </button>
      </div>
    </>
  );
}

export default function Admin() {
  const {
    t: { cms: c },
  } = useLanguage();
  const [access, setAccess] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState(
    () => window.location.pathname === "/admin/reset-password",
  );
  useEffect(() => {
    document.title = `${c.admin} | Advokatska kancelarija Gornik`;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex, nofollow, noarchive";
  }, [c.admin]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let sequence = 0;
    async function check() {
      const version = ++sequence;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error?.name === "AuthSessionMissingError") {
          if (active && version === sequence) setAccess("login");
          return;
        }
        if (error || !data) {
          if (active && version === sequence) setAccess("error");
          return;
        }
        if (!data.user) {
          if (active && version === sequence) setAccess("login");
          return;
        }
        const { data: allowed, error: denied } = await supabase.rpc("is_admin");
        if (active && version === sequence)
          setAccess(denied ? "error" : allowed ? "admin" : "denied");
      } catch {
        if (active && version === sequence) setAccess("error");
      }
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ++sequence;
        if (active) {
          setAccess("login");
          setRecovery(false);
        }
      } else {
        if (event === "PASSWORD_RECOVERY" && active) setRecovery(true);
        queueMicrotask(check);
      }
    });
    check();
    const loadingTimeout = setTimeout(() => {
      if (active)
        setAccess((current) => (current === "checking" ? "error" : current));
    }, 12000);
    const timer = setInterval(check, 60000);
    const visible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  async function logout() {
    setAccess("login");
    setRecovery(false);
    setMessage("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) setMessage(c.operationFailed);
  }
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: fields.get("email").trim(),
        password: fields.get("password"),
      });
      form.elements.password.value = "";
      if (error) setMessage(c.loginFailed);
    } catch {
      setMessage(c.loginFailed);
    } finally {
      setBusy(false);
    }
  }
  if (!supabase) return <p className="cms-notice">{c.configuration}</p>;
  if (access === "checking") return <p role="status">{c.loading}</p>;
  if (access === "error")
    return (
      <div role="alert" className="cms-notice">
        <p>{c.adminUnavailable}</p>
        <button
          className="cms-button secondary"
          onClick={() => window.location.reload()}
        >
          {c.retry}
        </button>
      </div>
    );
  if (access === "denied")
    return (
      <>
        <p role="alert" className="cms-notice">
          {c.unauthorized}
        </p>
        <button className="cms-button" onClick={logout}>
          {c.logout}
        </button>
      </>
    );
  if (access === "admin" && recovery)
    return (
      <form
        className="cms-login"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          const password = new FormData(event.currentTarget).get("password");
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            window.history.replaceState(null, "", "/admin");
            setRecovery(false);
            setMessage(c.passwordSaved);
          } catch {
            setMessage(c.operationFailed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>{c.changePassword}</h1>
        <label>
          {c.newPassword}
          <input
            type="password"
            name="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="cms-button" disabled={busy}>
          {c.changePassword}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    );
  if (access === "admin") return <Dashboard logout={logout} />;
  return (
    <form className="cms-login" onSubmit={login}>
      <h1>{c.loginHeading}</h1>
      <label>
        {c.email}
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          disabled={busy}
        />
      </label>
      <label>
        {c.password}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={busy}
        />
      </label>
      <button className="cms-button" disabled={busy}>
        {busy ? c.loading : c.login}
      </button>
      <button
        className="cms-button secondary"
        type="button"
        disabled={busy}
        onClick={async (event) => {
          const emailField = event.currentTarget.form.elements.email;
          if (!emailField.reportValidity()) return;
          setBusy(true);
          setMessage("");
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(
              emailField.value.trim(),
              { redirectTo: `${window.location.origin}/admin/reset-password` },
            );
            setMessage(error ? c.operationFailed : c.resetSent);
          } catch {
            setMessage(c.operationFailed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {c.reset}
      </button>
      {message && (
        <p className="cms-notice" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
