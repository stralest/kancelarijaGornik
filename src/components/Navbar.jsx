import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../i18n/language-context';
const logoGornik = '/logo-gornik.jpg';
import './Navbar.css';

const Navbar = ({ home = true }) => {
  const { language, changeLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = ['#home', '#about', '#services', '#why-us', '#contact'].map((href, index) => ({
    name: t.nav[index], href: home ? href : `/${href}`,
  }));
  navLinks.push({ name: t.cms.insights, href: '/clanci' });

  return (
    <nav className={`navbar ${isScrolled || !home ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <a href={home ? '#home' : '/#home'} className="navbar-logo">
          <img src={logoGornik} alt="" className="navbar-logo-image" width="320" height="302" fetchPriority="high" />
          <p className="navbar-logo-text">Gornik &amp; partners</p>
        </a>

        {/* Desktop Menu */}
        <ul className="nav-menu">
          {navLinks.map((link) => (
            <li key={link.name}>
              <a href={link.href} className="nav-link">
                {link.name}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <div className="language-switcher" role="group" aria-label={t.languageLabel}>
            <button type="button" lang="sr" className={language === 'sr' ? 'active' : ''} aria-pressed={language === 'sr'} onClick={() => changeLanguage('sr')}>SR</button>
            <span aria-hidden="true">|</span>
            <button type="button" lang="en" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          <button type="button" className="mobile-menu-icon" aria-label={isMobileMenuOpen ? t.closeMenuLabel : t.menuLabel} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <ul>
          {navLinks.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                className="mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
