import './Hero.css';

const Hero = () => {
  return (
    <section id="home" className="hero-section">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-prefix">Advokatska kancelarija</span>
          <span className="hero-title-name">Gornik &amp; partners</span>
        </h1>
        <p className="hero-slogan">Tradicija, poverenje i vrhunska pravna zaštita u svakom trenutku.</p>
        <a href="#contact" className="btn hero-btn">Kontaktirajte nas</a>
      </div>
    </section>
  );
};

export default Hero;
