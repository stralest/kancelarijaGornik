import { Award, Target, Lock, Zap } from 'lucide-react';
import './WhyUs.css';

const reasonsData = [
  {
    icon: <Award size={32} />,
    title: 'Dugogodišnje iskustvo',
    desc: 'Praksa duga više godina garantuje duboko poznavanje zakona i sudskih praksi u Republici Srbiji.'
  },
  {
    icon: <Target size={32} />,
    title: 'Individualan pristup',
    desc: 'Svakom klijentu i predmetu pristupamo sa posebnom pažnjom, uvažavajući sve specifičnosti slučaja.'
  },
  {
    icon: <Lock size={32} />,
    title: 'Diskrecija i profesionalnost',
    desc: 'Vaše poverenje je naš prioritet. Sve informacije su zaštićene strogom advokatskom tajnom.'
  },
  {
    icon: <Zap size={32} />,
    title: 'Efikasna pravna rešenja',
    desc: 'Fokusirani smo na pronalaženje najbržih i najpovoljnijih pravnih rešenja za naše klijente.'
  }
];

const WhyUs = () => {
  return (
    <section id="why-us" className="section bg-gray why-us-section">
      <div className="why-us-container">
        <div className="why-us-content">
          <h2 className="section-title" style={{ textAlign: 'left', margin: '0 0 2rem 0' }}>Zašto izabrati nas?</h2>
          <p className="why-us-intro">
            Odabir pravog advokata je ključan korak ka uspešnom rešavanju vašeg pravnog problema. Naša kancelarija nudi spoj tradicije, znanja i modernog pristupa pravu.
          </p>
          <div className="reasons-list">
            {reasonsData.map((reason, index) => (
              <div key={index} className="reason-item">
                <div className="reason-icon-wrapper">
                  {reason.icon}
                </div>
                <div>
                  <h4 className="reason-title">{reason.title}</h4>
                  <p className="reason-desc">{reason.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="why-us-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&q=80"
            alt="Pravda i zakon"
            className="why-us-image"
          />
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
