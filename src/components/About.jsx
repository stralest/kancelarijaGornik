import './About.css';
const logoGornik = '/logo-gornik.jpg';

const About = () => {
  return (
    <section id="about" className="section bg-gray about-section">
      <div className="about-container">
        <div className="about-text">
          <h2 className="section-title" style={{ textAlign: 'left', margin: '0 0 2rem 0' }}>O nama</h2>
          <p className="about-description">
            Advokatska kancelarija Gornik predstavlja sinonim za stručnost, posvećenost i apsolutnu diskreciju. Sa višegodišnjim iskustvom u pružanju vrhunskih pravnih usluga, naš tim advokata posvećen je zaštiti vaših interesa kroz najviše standarde advokatske profesije.
          </p>
          <p className="about-description">
            Naša praksa se temelji na dubokom razumevanju pravnog sistema, analitičkom pristupu svakom predmetu i izradi strategija koje su prilagođene specifičnim potrebama naših klijenata. Verujemo da je poverenje osnova svakog uspešnog pravnog zastupanja.
          </p>
          <div className="about-stats">
            <div className="stat-item">
              <span className="stat-number">8</span>
              <span className="stat-label">Godina iskustva</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Diskrecija</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Posvećenost</span>
            </div>
          </div>
        </div>
        <div className="about-logo-panel">
          <img
            src={logoGornik}
            alt="Advokatska kancelarija Gornik"
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
