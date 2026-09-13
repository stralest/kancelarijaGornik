const logoGornik = '/logo-gornik.jpg';
import './Footer.css';
import { useLanguage } from '../i18n/language-context';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <img src={logoGornik} alt="" className="footer-logo" loading="lazy" decoding="async" width="320" height="302" />
        <p className="footer-copyright">
          &copy; {currentYear} {t.footer}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
