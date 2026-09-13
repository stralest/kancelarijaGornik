import { Building2, Car, FileText, HeartHandshake, Home, Users } from 'lucide-react';
import { useLanguage } from '../i18n/language-context';
import './Services.css';

const icons = [Building2, Car, FileText, Users, HeartHandshake, Home];

const Services = () => {
  const { t } = useLanguage();

  return (
    <section id="services" className="section services-section">
      <h2 className="section-title">{t.services.title}</h2>
      <div className="services-grid">
        {t.services.items.map((service, index) => {
          const Icon = icons[index];
          return (
            <div key={index} className="service-card">
              <div className="service-icon"><Icon size={40} /></div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-desc">{service.description}</p>
              <div className="service-stats">
                {service.stats.map((stat) => (
                  <span key={stat} className="service-stat">{stat}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Services;
