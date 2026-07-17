import { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import './Contact.css';

const emailConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  toEmail: import.meta.env.VITE_CONTACT_TO_EMAIL || 'moep071@gmail.com',
};

const InstagramIcon = ({ className }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const Contact = () => {
  const [formStatus, setFormStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      setFormStatus('missing-config');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (formData.get('_honey')) {
      return;
    }

    const templateParams = {
      title: formData.get('subject'),
      name: formData.get('from_name'),
      time: new Date().toLocaleString('sr-RS', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      message: formData.get('message'),
      email: formData.get('from_email'),
      to_email: emailConfig.toEmail,
    };

    setFormStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: emailConfig.serviceId,
          template_id: emailConfig.templateId,
          user_id: emailConfig.publicKey,
          template_params: templateParams,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || `EmailJS error ${response.status}`);
      }

      form.reset();
      setFormStatus('success');
    } catch (error) {
      console.error('EmailJS send failed:', error);
      setErrorMessage(error.message);
      setFormStatus('error');
    }
  };

  return (
    <section id="contact" className="section contact-section">
      <h2 className="section-title">Kontakt</h2>
      <div className="contact-container">
        <div className="contact-info">
          <h3 className="contact-subtitle">Informacije</h3>
          <p className="contact-desc">
            Spremni smo da saslušamo vaš problem i ponudimo najbolje pravno rešenje. Kontaktirajte nas putem forme ili direktno.
          </p>

          <div className="info-list">
            <div className="info-item">
              <MapPin className="info-icon" />
              <div>
                <h4>Adresa</h4>
                <p>Zelengorska 4, Niš, Srbija</p>
              </div>
            </div>

            <div className="info-item">
              <Phone className="info-icon" />
              <div>
                <h4>Telefon</h4>
                <p>+381 69 321 82 75</p>
              </div>
            </div>

            <div className="info-item">
              <Mail className="info-icon" />
              <div>
                <h4>Email</h4>
                <p>advgornikmilos@gmail.com</p>
              </div>
            </div>

            <div className="info-item">
              <InstagramIcon className="info-icon" />
              <div>
                <h4>Instagram</h4>
                <p>
                  <a
                    href="https://www.instagram.com/consigliere.gornik/"
                    target="_blank"
                    rel="noreferrer"
                    className="contact-link"
                  >
                    consigliere.gornik
                  </a>
                </p>
              </div>
            </div>

            <div className="info-item">
              <Clock className="info-icon" />
              <div>
                <h4>Radno vreme</h4>
                <p>Ponedeljak - Petak: 09:00 - 17:00</p>
              </div>
            </div>
          </div>

          <div className="contact-map" aria-label="Lokacija kancelarije na Google mapi">
            <iframe
              title="Gornik & partners - Zelengorska 4, Nis"
              src="https://www.google.com/maps?q=Zelengorska%204%2C%20Ni%C5%A1%2C%20Srbija&z=18&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div className="contact-form-container">
          <h3 className="contact-subtitle">Pošaljite poruku</h3>
          <form className="contact-form" onSubmit={handleSubmit}>
            <input type="hidden" name="to_email" value={emailConfig.toEmail} />
            <input type="text" name="_honey" className="form-honey" tabIndex="-1" autoComplete="off" />
            <div className="form-group">
              <input type="text" name="from_name" placeholder="Vaše Ime i Prezime" required />
            </div>
            <div className="form-group">
              <input type="email" name="from_email" placeholder="Vaša Email adresa" required />
            </div>
            <div className="form-group">
              <input type="text" name="subject" placeholder="Naslov poruke" required />
            </div>
            <div className="form-group">
              <textarea name="message" rows="5" placeholder="Sadržaj poruke..." required></textarea>
            </div>
            <button type="submit" className="btn btn-submit" disabled={formStatus === 'sending'}>
              {formStatus === 'sending' ? 'Slanje...' : 'Pošalji poruku'}
            </button>
            {formStatus === 'success' && (
              <p className="form-status success">Poruka je poslata.</p>
            )}
            {formStatus === 'error' && (
              <p className="form-status error">Poruka trenutno ne može da se pošalje. Proverite EmailJS podešavanja.</p>
            )}
            {formStatus === 'error' && errorMessage && (
              <p className="form-status error">{`EmailJS odgovor: ${errorMessage}`}</p>
            )}
            {formStatus === 'missing-config' && (
              <p className="form-status error">Email servis nije podešen. Dodajte EmailJS ključeve u .env.local.</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
