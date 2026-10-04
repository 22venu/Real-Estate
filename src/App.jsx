import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import './App.css'

const AdminApp = lazy(() => import('./components/AdminApp.jsx'))

const properties = [
  {
    slug: 'abc-residency',
    name: 'ABC Residency',
    type: 'Apartment',
    location: 'Whitefield',
    configuration: '2 & 3 BHK',
    area: '1,150–1,650 sq.ft.',
    price: '₹75 Lakhs onwards',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
    alt: 'Warm contemporary residence with a landscaped courtyard',
    description: 'A considered collection of light-filled apartments, shaped around quiet gardens and the rhythms of everyday life.',
  },
  {
    slug: 'sage-villas',
    name: 'Sage Villas',
    type: 'Villa',
    location: 'Sarjapur Road',
    configuration: '3 & 4 BHK',
    area: '2,400–3,200 sq.ft.',
    price: '₹1.8 Crore onwards',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
    alt: 'Modern villa living room opening toward a green garden',
    description: 'Private garden homes where honest materials, generous proportions, and the outdoors meet naturally.',
  },
  {
    slug: 'obsidian-penthouse',
    name: 'Obsidian Penthouse',
    type: 'Penthouse',
    location: 'Indiranagar',
    configuration: '4 BHK',
    area: '3,800–4,500 sq.ft.',
    price: '₹3.2 Crore onwards',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85',
    alt: 'Sculptural modern home framed by mature trees',
    description: 'An elevated, intimate residence with expansive views, crafted details, and room to make your own.',
  },
]

const heroImage = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2200&q=90'
const defaultCompanySettings = {
  company_name: 'Meridian Estates',
  office_address: import.meta.env.VITE_COMPANY_ADDRESS || 'Meridian House, 4th Floor, MG Road, Bengaluru, Karnataka 560001',
  office_map_url: import.meta.env.VITE_COMPANY_MAP_URL || '',
  phone: import.meta.env.VITE_COMPANY_PHONE || '+91 98765 43210',
  email: import.meta.env.VITE_COMPANY_EMAIL || 'hello@meridianestates.in',
  whatsapp_number: import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210',
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [propertyRecords, setPropertyRecords] = useState(properties)
  const [companySettings, setCompanySettings] = useState(defaultCompanySettings)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!import.meta.env.VITE_FIREBASE_API_KEY) return undefined
    let active = true
    import('./services/leadService.js').then(({ fetchPublishedProperties, fetchPublicSettings }) => Promise.all([fetchPublishedProperties(), fetchPublicSettings()])).then(([records, settings]) => {
      if (!active) return
      if (records) setPropertyRecords(records)
      if (settings) setCompanySettings((current) => ({ ...current, ...settings }))
    }).catch(() => {})
    return () => { active = false }
  }, [])

  function navigate(to) {
    window.history.pushState({}, '', to)
    setPath(to)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedProperty = propertyRecords.find((property) => path.endsWith(property.slug))

  if (path.startsWith('/admin')) return <Suspense fallback={<div className="admin-loading">Loading admin…</div>}><AdminApp path={path} navigate={navigate} /></Suspense>

  function routeLink(to, label, className = '') {
    return <a className={className} href={to} onClick={(event) => { event.preventDefault(); navigate(to) }}>{label}</a>
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        {routeLink('/', <><span className="brand-mark">M</span><span className="brand-name">MERIDIAN <span>ESTATES</span></span></>, 'brand')}
        <button className="menu-toggle" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span></span><span></span>
        </button>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          {routeLink('/', 'Home')}
          {routeLink('/properties', 'Residences')}
          {routeLink('/about', 'Our approach')}
          {routeLink('/contact', 'Contact')}
          <button className="nav-cta" type="button" onClick={() => setDialog({ type: 'visit' })}>Arrange a visit <span aria-hidden="true">↗</span></button>
        </nav>
      </header>

      {selectedProperty ? <PropertyDetail property={selectedProperty} settings={companySettings} navigate={navigate} onEnquire={() => setDialog({ type: 'enquiry', property: selectedProperty.name })} onVisit={() => setDialog({ type: 'visit', property: selectedProperty.name })} onCall={() => setDialog({ type: 'call', property: selectedProperty.name })} /> : path === '/properties' ? <CollectionPage properties={propertyRecords} settings={companySettings} navigate={navigate} onEnquire={(property) => setDialog({ type: 'enquiry', property })} onVisit={(property) => setDialog({ type: 'visit', property })} /> : path === '/contact' ? <ContactPage properties={propertyRecords} settings={companySettings} /> : path === '/about' ? <AboutPage onEnquire={() => setDialog({ type: 'visit' })} /> : <HomePage properties={propertyRecords} settings={companySettings} navigate={navigate} onEnquire={(type, property) => setDialog({ type, property })} />}

      <Footer settings={companySettings} navigate={navigate} onEnquire={() => setDialog({ type: 'enquiry' })} />
      <a className="whatsapp" href={`https://wa.me/${companySettings.whatsapp_number.replace(/\D/g, '')}?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20your%20properties.`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">WA</a>
      {dialog && <EnquiryDialog dialog={dialog} properties={propertyRecords} onClose={() => setDialog(null)} />}
    </div>
  )
}

function HomePage({ properties, settings, navigate, onEnquire }) {
  return <main>
    <section className="hero" style={{ '--hero-image': `url(${heroImage})` }}>
      <div className="hero-copy">
        <p className="eyebrow light">Architecting tomorrow's landmarks</p>
        <h1>Spaces, composed<br />with architectural intent.</h1>
        <p className="hero-intro">A curated collection of residences across Bengaluru, built for those who read detail as language.</p>
        <div className="hero-actions">
          <button className="button button-light" type="button" onClick={() => navigate('/properties')}>Explore residences <span aria-hidden="true">↗</span></button>
          <button className="text-link light-link" type="button" onClick={() => onEnquire('enquiry')}>Speak to us <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="hero-caption"><span>01 / 03</span><span>Indiranagar, Bengaluru</span></div>
      <div className="hero-vertical">MERIDIAN ESTATES · BENGALURU</div>
    </section>

    <section className="intro-band content-width">
      <div className="intro-stat"><span className="eyebrow">Est. 2009</span><strong>15</strong><span>Years of craft</span></div>
      <p>Meridian Estates is a Bengaluru-based developer of architecturally significant residences. Each project is a study in space, light, and material — designed to be lived in for generations.</p>
      <button className="circle-link" type="button" aria-label="Discover our approach" onClick={() => navigate('/about')}>↗</button>
    </section>

    <section className="collection-section content-width">
      <SectionHeading eyebrow="The collection" title="A place of your own." action={routeLinkHelper(navigate, '/properties', 'View all residences')} />
      <div className="property-grid featured-grid">{properties.map((property, index) => <PropertyCard key={property.slug} property={property} index={index} navigate={navigate} onEnquire={() => onEnquire('enquiry', property.name)} />)}</div>
    </section>

    <section className="principles-section">
      <div className="content-width principles-inner">
        <div className="principles-title"><p className="eyebrow">Why Meridian</p><h2>Built on principle.<br />Finished with intent.</h2><p className="section-intro">A home should feel inevitable. We bring the same care to the unseen as to the details you touch every day.</p></div>
        <div className="principle-list">
          <Principle number="01" title="Architectural integrity">Form and function in conversation, guided by thoughtful design.</Principle>
          <Principle number="02" title="Precision build">Material-led construction and rigorous quality at every stage.</Principle>
          <Principle number="03" title="Transparent process">Clear pricing, RERA-compliant documentation, and no hidden commitments.</Principle>
          <Principle number="04" title="Sustainable by design">Landscaped commons, rainwater harvesting, and efficient systems.</Principle>
        </div>
      </div>
    </section>

    <section className="locations-section content-width">
      <SectionHeading eyebrow="Where we build" title="Rooted in Bengaluru." />
      <div className="location-grid">{[['01', 'Whitefield', '03 residences'], ['02', 'Indiranagar', '02 residences'], ['03', 'Sarjapur Road', '04 residences'], ['04', 'Hebbal', '02 residences']].map(([number, name, count]) => <button key={name} type="button" className="location-item" onClick={() => navigate('/properties')}><span>{number}</span><strong>{name}</strong><small>{count}</small><b aria-hidden="true">↗</b></button>)}</div>
    </section>

    <section className="testimonial-section">
      <div className="content-width testimonial-inner"><div className="testimonial-heading"><p className="eyebrow">In their words</p><h2>Trusted by those<br />who call it home.</h2><p>Our residents are our finest reference.</p></div><div className="quote-grid"><blockquote><span className="quote-mark">“</span><p>From the first visit to handover, the experience was seamless. The finish quality is exceptional.</p><footer><strong>Ananya R.</strong><span>Homeowner, Sage Villas</span></footer></blockquote><blockquote><span className="quote-mark">“</span><p>Meridian understood exactly what we wanted. The architecture speaks for itself.</p><footer><strong>Vikram &amp; Meera</strong><span>Homeowners, ABC Residency</span></footer></blockquote></div></div>
    </section>

    <OfficeLocation settings={settings} />
    <VisitSection settings={settings} onEnquire={() => onEnquire('enquiry')} onVisit={() => onEnquire('visit')} />
  </main>
}

function CollectionPage({ properties, settings, navigate, onEnquire, onVisit }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('All locations')
  const [type, setType] = useState('All home types')
  const filtered = useMemo(() => properties.filter((property) => `${property.name} ${property.location}`.toLowerCase().includes(query.toLowerCase()) && (location === 'All locations' || property.location === location) && (type === 'All home types' || property.type === type)), [properties, query, location, type])

  return <main className="inner-page"><div className="page-heading content-width"><p className="eyebrow">The collection / 2026</p><h1>Find your place<br />in Bengaluru.</h1><p>Thoughtful residences in the city's most considered neighbourhoods.</p></div><section className="content-width collection-page-body"><div className="filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search residences" aria-label="Search residences" /></label><label className="select-field"><span>Location</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option>{[...new Set(properties.map((item) => item.location))].map((item) => <option key={item}>{item}</option>)}</select></label><label className="select-field"><span>Residence type</span><select value={type} onChange={(event) => setType(event.target.value)}><option>All home types</option>{[...new Set(properties.map((item) => item.type))].map((item) => <option key={item}>{item}</option>)}</select></label><span className="result-count">{filtered.length} residences</span></div><div className="property-grid">{filtered.map((property, index) => <PropertyCard key={property.slug} property={property} index={index} navigate={navigate} onEnquire={() => onEnquire(property.name)} />)}</div>{filtered.length === 0 && <div className="empty-state"><h2>No residences found</h2><p>Try a different name or neighbourhood.</p><button className="text-link" onClick={() => { setQuery(''); setLocation('All locations'); setType('All home types') }}>Clear filters →</button></div>}</section><VisitSection settings={settings} onEnquire={() => onEnquire()} onVisit={() => onVisit()} /></main>
}

function PropertyDetail({ property, settings, navigate, onEnquire, onVisit, onCall }) {
  const propertyLocation = property.location || property.address || 'Bengaluru'
  const propertyAddress = property.address || `${propertyLocation}, Bengaluru`
  return <main className="detail-page"><div className="detail-image" style={{ backgroundImage: `url(${property.image})` }}><button className="back-link" type="button" onClick={() => navigate('/properties')}>← All residences</button><span className="image-label">{propertyLocation}</span></div><section className="content-width detail-content"><div className="detail-heading"><div><p className="eyebrow">{property.type} / Meridian collection</p><h1>{property.name}</h1><p className="detail-location">⌖ {propertyLocation}</p><p>{property.description}</p></div><div className="detail-price"><span>Starting from</span><strong>{property.price}</strong><div className="detail-actions"><button className="button button-dark" type="button" onClick={onEnquire}>Enquire about this home <span>↗</span></button><button className="button detail-secondary-button" type="button" onClick={onCall}>Request a call <span>↗</span></button>{settings.phone && <a className="button detail-secondary-button" href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>Call office</a>}</div></div></div><div className="detail-facts"><div><span>Configuration</span><strong>{property.configuration}</strong></div><div><span>Residence area</span><strong>{property.area}</strong></div><div><span>Address</span><strong>{propertyAddress}</strong></div><div><span>Designed for</span><strong>Living well, every day</strong></div></div><PropertyMap property={property} address={propertyAddress} /><VisitSection settings={settings} onEnquire={onEnquire} onVisit={onVisit} /></section></main>
}

function ContactPage({ properties, settings }) {
  return <main className="inner-page contact-page"><div className="page-heading content-width"><p className="eyebrow">Begin the conversation</p><h1>Come by<br />the studio.</h1><p>We would be glad to show you around, answer a question, or simply talk through what home means to you.</p></div><section className="content-width contact-layout"><div className="contact-details"><p className="eyebrow">Visit us</p><h2>{settings.company_name}</h2><p>{settings.office_address}</p><a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>{settings.phone} ↗</a><a href={`mailto:${settings.email}`}>{settings.email} ↗</a><div className="office-note"><span>Studio hours</span><strong>Monday – Saturday, 10 am – 6 pm</strong></div></div><div className="contact-form-wrap"><p className="eyebrow">Write to us</p><h2>Let's make a little time.</h2><EnquiryForm properties={properties} /></div></section><OfficeLocation settings={settings} /></main>
}

function PropertyMap({ property, address }) {
  return <section className="location-map-section"><div className="map-heading"><div><p className="eyebrow">Property location</p><h2>{property.name}</h2><p>{address}</p></div><a href={googleMapsLink(property.map_url, address)} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></div><GoogleMap title={`Map showing ${property.name}`} address={address} embedUrl={property.map_url} /></section>
}

function OfficeLocation({ settings }) {
  return <section className="office-map-section"><div className="content-width office-map-inner"><div className="office-map-copy"><p className="eyebrow">Visit us</p><h2>{settings.company_name}</h2><p>{settings.office_address}</p><a href={googleMapsLink(settings.office_map_url, settings.office_address)} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></div><GoogleMap title={`Map showing ${settings.company_name} office`} address={settings.office_address} embedUrl={settings.office_map_url} /></div></section>
}

function GoogleMap({ title, address, embedUrl }) {
  let src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  try {
    const url = new URL(embedUrl)
    if (url.origin === 'https://www.google.com' && url.pathname === '/maps/embed') src = url.href
  } catch {}
  return <div className="map-frame"><iframe title={title} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
}

function googleMapsLink(mapUrl, address) {
  try {
    const url = new URL(mapUrl)
    if (['https://www.google.com', 'https://maps.google.com', 'https://maps.app.goo.gl'].includes(url.origin)) return url.href
  } catch {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function AboutPage({ onEnquire }) {
  return <main className="inner-page about-page"><div className="page-heading content-width"><p className="eyebrow">Our approach / Est. 2009</p><h1>Architecture for<br />the way we live.</h1><p>We make homes with a sense of permanence: places shaped by light, material, landscape, and the lives that fill them.</p></div><div className="about-image" style={{ backgroundImage: `url(${heroImage})` }} role="img" aria-label="Contemporary architecture in a landscaped setting" /><section className="content-width about-copy"><p className="eyebrow">A considered practice</p><h2>Good design is not an addition.<br />It is the beginning.</h2><p>Meridian Estates is a Bengaluru-based developer of architecturally significant residences. Since 2009, we have partnered with architects, craftspeople, and residents to build a collection of places with clarity of purpose and a lasting relationship to their surroundings.</p><button className="button button-dark" type="button" onClick={onEnquire}>Meet us at the studio <span>↗</span></button></section></main>
}

function PropertyCard({ property, index, navigate, onEnquire }) {
  return <article className="property-card" style={{ '--card-index': index }}><button className="property-image-button" type="button" onClick={() => navigate(`/properties/${property.slug}`)} aria-label={`View ${property.name}`}><img src={property.image} alt={property.alt} loading="lazy" /><span className="property-type">{property.type}</span><span className="image-arrow" aria-hidden="true">↗</span></button><div className="property-card-content"><div className="property-card-title"><div><h3><button type="button" onClick={() => navigate(`/properties/${property.slug}`)}>{property.name}</button></h3><p><span aria-hidden="true">⌖</span> {property.location || property.address}, Bengaluru</p>{property.contact_phone && <a className="property-contact-link" href={`tel:${property.contact_phone.replace(/[^+\d]/g, '')}`}>{property.contact_phone}</a>}</div><span className="starting-price">{property.price}</span></div><div className="property-facts"><div><span>Configuration</span><strong>{property.configuration}</strong></div><div><span>Area</span><strong>{property.area}</strong></div></div><div className="property-card-actions"><button type="button" onClick={() => navigate(`/properties/${property.slug}`)}>View details <span>↗</span></button><button type="button" onClick={onEnquire}>Enquire</button></div></div></article>
}

function SectionHeading({ eyebrow, title, action }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <div className="section-action">{action}</div>}</div>
}

function Principle({ number, title, children }) {
  return <div className="principle"><span>{number}</span><div><h3>{title}</h3><p>{children}</p></div><b aria-hidden="true">↗</b></div>
}

function VisitSection({ settings, onEnquire, onVisit }) {
  return <section className="visit-section"><div className="content-width visit-inner"><div><p className="eyebrow light">A good place to begin</p><h2>Your next address<br />begins with a visit.</h2></div><div className="visit-actions"><button className="button button-light" type="button" onClick={onVisit}>Schedule a site visit <span>↗</span></button><button className="text-link light-link" type="button" onClick={onEnquire}>Make an enquiry →</button><p>Or call us directly<br /><a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>{settings.phone}</a></p></div></div></section>
}

function Footer({ settings, navigate, onEnquire }) {
  return <footer className="site-footer"><div className="content-width footer-main"><div className="footer-about"><button className="footer-brand" type="button" onClick={() => navigate('/')}>{settings.company_name.toUpperCase()}</button><p>Architecting tomorrow's landmarks. Thoughtful residences across Bengaluru, built with precision and finished with intent.</p><div className="social-links"><a href="#instagram" aria-label="Instagram">IG</a><a href="#linkedin" aria-label="LinkedIn">in</a><a href="#facebook" aria-label="Facebook">f</a></div></div><div className="footer-column"><p>Explore</p><button onClick={() => navigate('/')}>Home</button><button onClick={() => navigate('/about')}>Our approach</button><button onClick={() => navigate('/properties')}>Residences</button><button onClick={() => navigate('/contact')}>Contact</button></div><div className="footer-column footer-contact"><p>Connect</p><span>{settings.office_address}</span><a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a><button className="footer-enquire" onClick={onEnquire}>Make an enquiry ↗</button></div></div><div className="content-width footer-bottom"><span>© 2026 {settings.company_name}. All rights reserved.</span><span>Crafted for living, in Bengaluru.</span></div></footer>
}

function EnquiryDialog({ dialog, properties, onClose }) {
  const title = dialog.type === 'visit' ? 'Plan a visit.' : dialog.type === 'call' ? 'Request a call.' : 'Start a conversation.'
  useEffect(() => {
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="enquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" type="button" aria-label="Close" onClick={onClose}>×</button><p className="eyebrow">Meridian Estates / Bengaluru</p><h2 id="dialog-title">{title}</h2><p className="dialog-intro">{dialog.property ? `Tell us a little about yourself and our team will be in touch about ${dialog.property}.` : 'Leave us your details and our team will be in touch shortly.'}</p><EnquiryForm kind={dialog.type} property={dialog.property} properties={properties} /></section></div>
}

function EnquiryForm({ kind = 'enquiry', property, properties }) {
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dateField = kind === 'visit' ? 'visit_date' : 'preferred_date'
  const timeField = kind === 'visit' ? 'visit_time' : 'preferred_time'
  if (submitted) return <div className="form-success" role="status"><span>✓</span><h3>{kind === 'visit' ? 'Visit request received.' : kind === 'call' ? 'Callback request received.' : 'Thank you. We have your note.'}</h3><p>{kind === 'visit' ? 'Your visit is requested. Our team will contact you to confirm.' : 'Our Bengaluru team will be in touch soon.'}</p></div>

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    if ((kind === 'visit' || kind === 'call') && values[dateField] < new Date().toISOString().slice(0, 10)) {
      setError('Choose today or a future date.')
      setBusy(false)
      return
    }
    try {
      const { submitLead } = await import('./services/leadService.js')
      await submitLead({
        kind,
        name: values.name,
        phone: values.phone,
        email: values.email,
        message: values.message,
        property: values.property || property,
        preferredDate: values.preferred_date || values.visit_date,
        preferredTime: values.preferred_time || values.visit_time,
      })
      setSubmitted(true)
    } catch {
      setError('We could not send your request right now. Please call or email our team instead.')
    } finally {
      setBusy(false)
    }
  }

  return <form className="enquiry-form" onSubmit={submit}><label>Your name<input name="name" autoComplete="name" placeholder="Full name" required /></label><div className="form-row"><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+91" required /></label></div>{kind === 'visit' || kind === 'call' ? <div className="form-row"><label>{kind === 'visit' ? 'Preferred visit date' : 'Preferred callback date'}<input name={dateField} type="date" required /></label><label>Preferred time<select name={timeField} defaultValue="" required><option value="" disabled>Select a time</option><option>10:00 AM</option><option>11:00 AM</option><option>2:00 PM</option><option>4:00 PM</option></select></label></div> : null}<label>Interested property (optional)<select name="property" defaultValue={property || ''}><option value="">No preference</option>{property && !properties?.some((item) => item.name === property) && <option value={property}>{property}</option>}{properties?.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></label><label>How can we help?<textarea name="message" rows="3" defaultValue={property ? `I'm interested in ${property}.` : ''} placeholder="Tell us what you have in mind" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark form-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : kind === 'visit' ? 'Request site visit' : kind === 'call' ? 'Request a call' : 'Send enquiry'} <span>↗</span></button><p className="form-privacy">Your details will only be used to respond to your request.</p></form>
}

function routeLinkHelper(navigate, to, label) {
  return <a href={to} onClick={(event) => { event.preventDefault(); navigate(to) }}>{label} <span aria-hidden="true">↗</span></a>
}

export default App
