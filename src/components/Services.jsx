import { Building2, Car, FileText, HeartHandshake, Home, Users } from 'lucide-react';
import './Services.css';

const servicesData = [
  {
    icon: <Building2 size={40} />,
    title: 'Zastupanje privrednih društava',
    description: 'Pružamo sveobuhvatnu pravnu podršku privrednim društvima, preduzetnicima i investitorima u svakodnevnom poslovanju. Naš rad obuhvata osnivanje kompanija, izradu internih akata, ugovora, pravno savetovanje, pregovore, rešavanje privrednih sporova i zastupanje pred sudovima i državnim institucijama. Fokusirani smo na pravnu sigurnost poslovanja i zaštitu interesa naših klijenata u svim fazama poslovnog razvoja.',
    stats: ['6+ godina iskustva', 'Više od 150 uspešno zastupanih klijenata']
  },
  {
    icon: <Car size={40} />,
    title: 'Naplata štete',
    description: 'Zastupamo fizička i pravna lica u postupcima naknade materijalne i nematerijalne štete. Posebno iskustvo posedujemo u predmetima saobraćajnih nezgoda, povreda na radu, štete nastale usled odgovornosti trećih lica i sporovima sa osiguravajućim društvima. Naš cilj je efikasna zaštita prava klijenata i ostvarivanje pravične naknade u što kraćem roku.',
    stats: ['6+ godina iskustva', 'Više od 300 uspešno rešenih predmeta']
  },
  {
    icon: <FileText size={40} />,
    title: 'Ugovori',
    description: 'Vrlo pažljivo pristupamo izradi i analizi svih vrsta ugovora kako bismo klijentima obezbedili maksimalnu pravnu sigurnost. Pomažemo u sastavljanju privrednih, građanskih, radnih i drugih ugovora, kao i u pregovorima i pravnoj proceni postojećih obaveza i rizika. Kvalitetno pripremljen ugovor predstavlja najbolju zaštitu od budućih sporova.',
    stats: ['6+ godina iskustva', 'Više od 500 izrađenih i analiziranih ugovora']
  },
  {
    icon: <Users size={40} />,
    title: 'Razvodi',
    description: 'Pružamo profesionalnu i diskretnu pravnu pomoć u postupcima razvoda braka, kako sporazumnim tako i parničnim putem. Svesni smo da su porodični sporovi izuzetno osetljivi, zbog čega svakom klijentu pristupamo sa posebnom pažnjom i posvećenošću. Cilj nam je pronalaženje najboljeg rešenja uz zaštitu ličnih, roditeljskih i imovinskih prava.',
    stats: ['6+ godina iskustva', 'Više od 200 vođenih porodičnih postupaka']
  },
  {
    icon: <HeartHandshake size={40} />,
    title: 'Povera dece i alimentacija',
    description: 'Zastupamo klijente u postupcima poveravanja dece, određivanja modela viđanja i ostvarivanja prava na alimentaciju. Poseban akcenat stavljamo na zaštitu najboljeg interesa deteta i postizanje stabilnih i održivih rešenja za porodicu. Pružamo podršku kako u sudskim postupcima, tako i u pregovorima i sporazumnom rešavanju odnosa između roditelja.',
    stats: ['6+ godina iskustva', 'Više od 180 uspešno okončanih postupaka']
  },
  {
    icon: <Home size={40} />,
    title: 'Imovinski odnosi',
    description: 'Pružamo pravnu pomoć u rešavanju imovinskih i vlasničkih odnosa, deobi zajedničke imovine, upisu prava svojine u katastar nepokretnosti, konverziji zemljišta, kao i u naslednim i drugim građanskopravnim postupcima. Klijentima pomažemo da efikasno zaštite svoju imovinu, regulišu vlasničke odnose i ostvare svoja prava pred nadležnim organima i sudovima.',
    stats: ['6+ godina iskustva', 'Više od 250 uspešno rešenih imovinskih sporova']
  }
];

const Services = () => {
  return (
    <section id="services" className="section services-section">
      <h2 className="section-title">Oblasti prava</h2>
      <div className="services-grid">
        {servicesData.map((service, index) => (
          <div key={index} className="service-card">
            <div className="service-icon">{service.icon}</div>
            <h3 className="service-title">{service.title}</h3>
            <p className="service-desc">{service.description}</p>
            <div className="service-stats">
              {service.stats.map((stat) => (
                <span key={stat} className="service-stat">{stat}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Services;
