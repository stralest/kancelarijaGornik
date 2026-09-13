import { Award, Target, Lock, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/language-context';
import './WhyUs.css';

const icons = [Award, Target, Lock, Zap];

const WhyUs = () => {
  const { t } = useLanguage();

  return (
    <section id="why-us" className="section bg-gray why-us-section">
      <div className="why-us-container">
        <div className="why-us-content">
          <h2 className="section-title" style={{ textAlign: 'left', margin: '0 0 2rem 0' }}>{t.whyUs.title}</h2>
          <p className="why-us-intro">{t.whyUs.intro}</p>
          <div className="reasons-list">
            {t.whyUs.reasons.map((reason, index) => {
              const Icon = icons[index];
              return (
                <div key={index} className="reason-item">
                  <div className="reason-icon-wrapper"><Icon size={32} /></div>
                  <div>
                    <h3 className="reason-title">{reason.title}</h3>
                    <p className="reason-desc">{reason.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="why-us-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&q=80"
            alt={t.whyUs.imageAlt}
            className="why-us-image"
            loading="lazy"
            decoding="async"
            width="1200"
            height="800"
          />
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
