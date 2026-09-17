import "./About.css";
const logoGornik = "/logo-gornik.jpg";
import { useLanguage } from "../i18n/language-context";

const About = () => {
  const { t } = useLanguage();
  return (
    <section id="about" className="section bg-gray about-section">
      <div className="about-container">
        <div className="about-text">
          <h2
            className="section-title"
            style={{ textAlign: "left", margin: "0 0 2rem 0" }}
          >
            {t.about.title}
          </h2>
          {t.about.paragraphs.map((paragraph) => (
            <p className="about-description" key={paragraph}>
              {paragraph}
            </p>
          ))}
          <div className="about-stats">
            <div className="stat-item">
              <span className="stat-number">8</span>
              <span className="stat-label">{t.about.stats[0]}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">{t.about.stats[1]}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">{t.about.stats[2]}</span>
            </div>
          </div>
        </div>
        <div className="about-logo-panel">
          <img
            src={logoGornik}
            alt={t.about.logoAlt}
            className="about-logo"
            loading="lazy"
            decoding="async"
            width="320"
            height="302"
          />
        </div>
      </div>
    </section>
  );
};

export default About;
