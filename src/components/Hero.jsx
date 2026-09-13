import './Hero.css';
import { useLanguage } from '../i18n/language-context';

const Hero = () => {
  const { t } = useLanguage();
  return (
    <section id="home" className="hero-section">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-prefix">{t.hero.prefix}</span>
          <span className="hero-title-name">Gornik &amp; partners</span>
        </h1>
        <p className="hero-slogan">{t.hero.slogan}</p>
        <a href="#contact" className="btn hero-btn">{t.hero.contact}</a>
      </div>
    </section>
  );
};

export default Hero;
