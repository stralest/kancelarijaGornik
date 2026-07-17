import logoGornik from '../assets/logo-gornik.jpg';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <img src={logoGornik} alt="Advokatska kancelarija Gornik" className="footer-logo" />
        <p className="footer-copyright">
          &copy; {currentYear} Advokatska kancelarija Gornik. Sva prava zadržana.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
