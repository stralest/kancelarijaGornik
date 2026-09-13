const logoGornik = '/logo-gornik.jpg';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <img src={logoGornik} alt="" className="footer-logo" loading="lazy" decoding="async" width="320" height="302" />
        <p className="footer-copyright">
          &copy; {currentYear} Advokatska kancelarija Gornik. Sva prava zadržana.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
