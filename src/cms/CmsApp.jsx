import { Component, lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { LanguageProvider } from "../i18n/LanguageContext";
import { useLanguage } from "../i18n/language-context";
import PublicArticles from "./PublicArticles";
import "./cms.css";

const Admin = lazy(() => import("./Admin"));
class AdminErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error("Admin failed to render:", error);
  }
  render() {
    if (this.state.failed)
      return (
        <div role="alert" className="cms-notice">
          <p>{this.props.message}</p>
          <button
            className="cms-button secondary"
            onClick={() => window.location.reload()}
          >
            {this.props.retry}
          </button>
        </div>
      );
    return this.props.children;
  }
}
function CmsPage({ path, initialData }) {
  const {
    t: { cms: c },
  } = useLanguage();
  return (
    <>
      <Navbar home={false} />
      <main className="cms-page">
        <Suspense fallback={<p role="status">{c.loading}</p>}>
          {path === "/admin" || path.startsWith("/admin/") ? (
            <AdminErrorBoundary message={c.adminUnavailable} retry={c.retry}>
              <Admin />
            </AdminErrorBoundary>
          ) : (
            <PublicArticles initialData={initialData} path={path} />
          )}
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
export default function CmsApp(props) {
  return (
    <LanguageProvider>
      <CmsPage {...props} />
    </LanguageProvider>
  );
}
