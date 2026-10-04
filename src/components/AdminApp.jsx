import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '../lib/firebase.js'
import './AdminApp.css'

const menuItems = [
  ['dashboard', 'Overview'],
  ['properties', 'Properties'],
  ['enquiries', 'Enquiries'],
  ['call-requests', 'Call requests'],
  ['site-visits', 'Site visits'],
  ['site-settings', 'Site settings'],
]

const statusOptions = {
  enquiries: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CLOSED'],
  'call-requests': ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CLOSED'],
  'site-visits': ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
}

const sectionNames = {
  enquiries: 'Enquiries',
  'call-requests': 'Call requests',
  'site-visits': 'Site visits',
  'site-settings': 'Site settings',
}

const defaultSiteSettings = {
  company_name: 'Meridian Estates',
  office_address: 'Meridian House, 4th Floor, MG Road, Bengaluru, Karnataka 560001',
  office_map_url: '',
  phone: '+91 98765 43210',
  email: 'hello@meridianestates.in',
  whatsapp_number: '919876543210',
}

export default function AdminApp({ path, navigate }) {
  const [admin, setAdmin] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    if (!auth) {
      return undefined
    }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdmin(null)
        setAuthReady(true)
        return
      }
      try {
        const userRecord = await getDoc(doc(db, 'users', user.uid))
        if (!userRecord.exists() || userRecord.data().role !== 'admin') {
          await signOut(auth)
          setAuthMessage('This account is not authorized. Set role to "admin" in its users document.')
          setAdmin(null)
        } else {
          setAdmin({ ...user, name: userRecord.data().name || user.displayName })
          setAuthMessage('')
        }
      } catch {
        setAuthMessage('We could not verify admin access. Check your Firebase rules and try again.')
        setAdmin(null)
      } finally {
        setAuthReady(true)
      }
    })
  }, [])

  if (!firebaseConfigured) return <AdminLogin navigate={navigate} message="Add your Firebase project values to .env.local to enable admin sign-in." />
  if (!authReady) return <div className="admin-loading">Checking admin access…</div>
  if (!admin) return <AdminLogin navigate={navigate} message={authMessage} />

  const section = path.split('/')[2] || 'dashboard'
  return <AdminShell admin={admin} section={section} navigate={navigate} />
}

function AdminLogin({ navigate, message }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(message)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch {
      setError('Sign-in failed. Check your email and password, then try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-login-page">
    <button className="admin-back-link" type="button" onClick={() => navigate('/')}>← Back to website</button>
    <section className="admin-login-panel">
      <div className="admin-brand"><span className="brand-mark">M</span><span>MERIDIAN <small>ESTATES / ADMIN</small></span></div>
      <p className="admin-eyebrow">Staff access</p>
      <h1>Sign in.</h1>
      <p className="admin-login-copy">Use your company administrator account to continue.</p>
      {!firebaseConfigured ? <div className="admin-notice">{message}<br /><span>See .env.example for the required values.</span></div> : <form className="admin-form" onSubmit={handleSubmit}>
        <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {(error || message) && <p className="admin-error" role="alert">{error || message}</p>}
        <button className="admin-primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin'}</button>
      </form>}
      <p className="admin-login-footnote">Customer accounts are not required.</p>
    </section>
  </main>
}

function AdminShell({ admin, section, navigate }) {
  const activeSection = menuItems.some(([key]) => key === section) ? section : 'dashboard'

  async function handleSignOut() {
    await signOut(auth)
    navigate('/admin/login')
  }

  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <button type="button" className="admin-brand" onClick={() => navigate('/')}><span className="brand-mark">M</span><span>MERIDIAN<small>ADMINISTRATION</small></span></button>
      <p className="admin-nav-label">WORKSPACE</p>
      <nav aria-label="Admin navigation">{menuItems.map(([key, label]) => <button key={key} type="button" className={activeSection === key ? 'admin-nav-link active' : 'admin-nav-link'} onClick={() => navigate(`/admin/${key}`)}><span className="admin-nav-dot" />{label}</button>)}</nav>
      <button type="button" className="admin-site-link" onClick={() => navigate('/')}>← View public website</button>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div><span className="admin-topbar-label">MERIDIAN ESTATES</span><span className="admin-topbar-divider">/</span><span>Administration</span></div><div className="admin-user"><span>{admin.email}</span><button type="button" onClick={handleSignOut}>Sign out</button></div></header>
      <AdminWorkspace key={activeSection} section={activeSection} navigate={navigate} />
    </div>
  </div>
}

function AdminWorkspace({ section, navigate }) {
  const [records, setRecords] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings)
  const collectionName = section === 'properties' ? 'properties' : section === 'call-requests' ? 'call_requests' : section === 'site-visits' ? 'site_visits' : 'enquiries'

  const loadData = useCallback(async () => {
    try {
      if (section === 'dashboard') {
        const [properties, enquiries, calls, visits] = await Promise.all(['properties', 'enquiries', 'call_requests', 'site_visits'].map((name) => getDocs(collection(db, name))))
        const enquiryRows = enquiries.docs.map((item) => item.data())
        const callRows = calls.docs.map((item) => item.data())
        const visitRows = visits.docs.map((item) => item.data())
        setMetrics({
          properties: properties.size,
          activeProperties: properties.docs.filter((item) => item.data().status === 'ACTIVE').length,
          newEnquiries: enquiryRows.filter((item) => item.status === 'NEW').length,
          pendingCalls: callRows.filter((item) => item.status === 'NEW').length,
          requestedVisits: visitRows.filter((item) => item.status === 'REQUESTED').length,
          confirmedVisits: visitRows.filter((item) => item.status === 'CONFIRMED').length,
        })
        setRecords([])
      } else if (section === 'site-settings') {
        const snapshot = await getDoc(doc(db, 'site_settings', 'public'))
        setSiteSettings({ ...defaultSiteSettings, ...(snapshot.exists() ? snapshot.data() : {}) })
        setRecords([])
      } else {
        try {
          const snapshot = await getDocs(query(collection(db, collectionName), orderBy('created_at', 'desc')))
          setRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        } catch {
          const snapshot = await getDocs(collection(db, collectionName))
          setRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        }
      }
    } catch {
      setError('We could not load this section. Check your connection and Firebase rules.')
    } finally {
      setBusy(false)
    }
  }, [collectionName, section])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  async function refreshData() {
    setBusy(true)
    setError('')
    await loadData()
  }

  async function saveProperty(values, imageWarning = '') {
    setNotice('')
    try {
      const propertyData = {
        ...values,
        slug: values.slug || values.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        status: values.status || 'ACTIVE',
        updated_at: serverTimestamp(),
      }
      if (editing?.id) await updateDoc(doc(db, 'properties', editing.id), propertyData)
      else await addDoc(collection(db, 'properties'), { ...propertyData, created_at: serverTimestamp() })
      setEditing(null)
      setNotice(imageWarning || 'Property saved.')
      await loadData()
      return true
    } catch (saveError) {
      const message = saveError?.code === 'permission-denied'
        ? 'Firestore denied this save. Publish the latest firestore.rules and verify this user document has role set to the string "admin".'
        : `Could not save the property${saveError?.code ? ` (${saveError.code})` : ''}. Check your Firebase project and try again.`
      setNotice(message)
      return message
    }
  }

  async function saveSiteSettings(values) {
    try {
      const settings = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]))
      await setDoc(doc(db, 'site_settings', 'public'), { ...settings, updated_at: serverTimestamp() }, { merge: true })
      setSiteSettings({ ...defaultSiteSettings, ...settings })
      setNotice('Office and contact details saved.')
      return true
    } catch {
      setNotice('Could not save site settings. Check Firestore rules and try again.')
      return false
    }
  }

  async function removeProperty(property) {
    if (!window.confirm(`Delete ${property.name}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'properties', property.id))
      setNotice('Property deleted.')
      await loadData()
    } catch {
      setNotice('Could not delete the property. Check Firebase rules and try again.')
    }
  }

  async function changeStatus(record, status) {
    try {
      await updateDoc(doc(db, collectionName, record.id), { status, updated_at: serverTimestamp() })
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status } : item))
    } catch {
      setNotice('Could not update status. Check Firebase rules and try again.')
    }
  }

  async function removeLead(record) {
    if (!window.confirm(`Delete the request from ${record.name || 'this customer'}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, collectionName, record.id))
      setRecords((current) => current.filter((item) => item.id !== record.id))
      setNotice('Request deleted.')
    } catch {
      setNotice('Could not delete the request. Check Firestore rules and try again.')
    }
  }

  const filteredRecords = useMemo(() => records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase())), [records, search])

  return <main className="admin-content">
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Company workspace</p><h1>{activeTitle(section)}</h1><p>Manage Meridian Estates activity and customer requests.</p></div>{section === 'properties' && <button className="admin-primary-button compact" type="button" onClick={() => setEditing({})}>+ Add property</button>}</div>
    {notice && <p className="admin-inline-notice" role="status">{notice}</p>}
    {error && <div className="admin-error-box" role="alert">{error}<button type="button" onClick={refreshData}>Try again</button></div>}
    {busy ? <div className="admin-data-state">Loading {activeTitle(section).toLowerCase()}…</div> : section === 'dashboard' ? <Dashboard metrics={metrics} navigate={navigate} /> : section === 'properties' ? <PropertyManagement records={records} onEdit={setEditing} onDelete={removeProperty} /> : section === 'site-settings' ? <SiteSettingsEditor settings={siteSettings} onSave={saveSiteSettings} /> : <LeadManagement section={section} records={filteredRecords} search={search} setSearch={setSearch} onStatus={changeStatus} onDelete={removeLead} />}
    {editing && <PropertyEditor property={editing} onClose={() => setEditing(null)} onSave={saveProperty} />}
  </main>
}

function Dashboard({ metrics, navigate }) {
  const cards = [
    ['Total properties', metrics?.properties ?? 0, 'properties'],
    ['Active properties', metrics?.activeProperties ?? 0, 'properties'],
    ['New enquiries', metrics?.newEnquiries ?? 0, 'enquiries'],
    ['Pending call requests', metrics?.pendingCalls ?? 0, 'call-requests'],
    ['Requested visits', metrics?.requestedVisits ?? 0, 'site-visits'],
    ['Confirmed visits', metrics?.confirmedVisits ?? 0, 'site-visits'],
  ]
  return <><div className="admin-metrics">{cards.map(([label, value, target]) => <button type="button" key={label} className="admin-metric" onClick={() => navigate(`/admin/${target}`)}><span>{label}</span><strong>{value}</strong><small>View records →</small></button>)}</div><section className="admin-welcome"><p className="admin-eyebrow">Welcome to your workspace</p><h2>Your property operations, in one place.</h2><p>Use the navigation to update listings and follow up on customer requests.</p></section></>
}

function PropertyManagement({ records, onEdit, onDelete }) {
  if (!records.length) return <div className="admin-data-state">No properties yet. Add your first listing to get started.</div>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Property</th><th>Location</th><th>Contact</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map((property) => <tr key={property.id}><td><strong>{property.name}</strong><small>{property.property_type || property.type || 'Residence'} · {property.configuration || property.bedrooms || ''}</small></td><td>{property.location || property.address || '—'}</td><td>{property.contact_phone || '—'}</td><td>{property.price || '—'}</td><td><span className={`admin-status ${String(property.status || 'ACTIVE').toLowerCase()}`}>{property.status || 'ACTIVE'}</span></td><td className="admin-row-actions"><button type="button" onClick={() => onEdit(property)}>Edit</button><button type="button" onClick={() => onDelete(property)}>Delete</button></td></tr>)}</tbody></table></div>
}

function LeadManagement({ section, records, search, setSearch, onStatus, onDelete }) {
  const fields = section === 'enquiries'
    ? [['Customer', (record) => record.name], ['Contact', (record) => record.phone], ['Property', (record) => record.property_name || record.property || '—'], ['Message', (record) => record.message || '—']]
    : section === 'call-requests'
      ? [['Customer', (record) => record.name], ['Contact', (record) => record.phone], ['Property', (record) => record.property_name || record.property || '—'], ['Preferred time', (record) => [record.preferred_date, record.preferred_time].filter(Boolean).join(' · ') || '—']]
      : [['Customer', (record) => record.name], ['Contact', (record) => record.phone], ['Property', (record) => record.property_name || record.property || '—'], ['Visit time', (record) => [record.visit_date, record.visit_time].filter(Boolean).join(' · ') || '—']]
  return <><div className="admin-list-toolbar"><label>Search requests<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, email or property" /></label><span>{records.length} records</span></div>{records.length === 0 ? <div className="admin-data-state">No {sectionNames[section].toLowerCase()} found.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{fields.map(([label]) => <th key={label}>{label}</th>)}<th>Status</th><th>Received</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}>{fields.map(([label, value]) => <td key={label}>{value(record)}</td>)}<td><select className="admin-status-select" aria-label={`Update ${record.name || 'request'} status`} value={record.status || statusOptions[section][0]} onChange={(event) => onStatus(record, event.target.value)}>{statusOptions[section].map((status) => <option key={status}>{status}</option>)}</select></td><td>{formatDate(record.created_at)}</td><td className="admin-row-actions"><button type="button" onClick={() => onDelete(record)}>Delete</button></td></tr>)}</tbody></table></div>}</>
}

function SiteSettingsEditor({ settings, onSave }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const saved = await onSave(values)
    setNotice(saved ? 'Site settings saved.' : 'Could not save settings. Check Firestore rules and try again.')
    setBusy(false)
  }

  return <section className="admin-settings-panel"><p className="admin-eyebrow">Public website</p><h2>Office and contact details</h2><p>These details appear on the Contact page, footer, office map, and visit call-to-action.</p><form className="admin-property-form" onSubmit={submit}><label>Company name<input name="company_name" defaultValue={settings.company_name} required /></label><label>Office address<textarea name="office_address" rows="2" defaultValue={settings.office_address} required /></label><label>Google Maps embed URL<input name="office_map_url" type="url" defaultValue={settings.office_map_url} placeholder="https://www.google.com/maps/embed?pb=…" /></label><div className="admin-form-row"><label>Public phone<input name="phone" type="tel" defaultValue={settings.phone} required /></label><label>Contact email<input name="email" type="email" defaultValue={settings.email} required /></label></div><label>WhatsApp number<input name="whatsapp_number" type="tel" defaultValue={settings.whatsapp_number} placeholder="Country code and number, digits only" required /></label>{notice && <p className="admin-inline-notice" role="status">{notice}</p>}<button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save site settings'}</button></form></section>
}

function PropertyEditor({ property, onClose, onSave }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(formData.entries())
    const imageFile = values.image_file
    delete values.image_file
    values.amenities = values.amenities.split(',').map((item) => item.trim()).filter(Boolean)
    let imageWarning = ''
    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        if (imageFile.size > 10 * 1024 * 1024 || !imageFile.type.startsWith('image/')) {
          imageWarning = 'Choose an image file smaller than 10 MB. Property details were saved without the image.'
        } else {
          try {
            const { uploadPropertyImage } = await import('../services/cloudinaryUpload.js')
            const uploadedImage = await uploadPropertyImage(imageFile)
            values.image_url = uploadedImage.imageUrl
            values.image_public_id = uploadedImage.imagePublicId
          } catch (uploadError) {
            const reason = uploadError?.code === 'cloudinary/not-configured'
              ? 'Add the Cloudinary cloud name and unsigned upload preset to .env.local.'
              : `Cloudinary upload failed${uploadError?.code ? ` (${uploadError.code})` : ''}: ${uploadError.message}`
            imageWarning = `Property details were saved without the image. ${reason}`
          }
        }
      }
      const saved = await onSave(values, imageWarning)
      if (saved !== true) setError(typeof saved === 'string' ? saved : 'We could not save this property. Check your Firebase setup and try again.')
    } catch {
      setError('Could not save the property details. Check the Firestore rules and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="property-editor-title"><div className="admin-editor-heading"><div><p className="admin-eyebrow">Listing details</p><h2 id="property-editor-title">{property.id ? 'Edit property' : 'Add property'}</h2></div><button type="button" aria-label="Close" onClick={onClose}>×</button></div><form className="admin-property-form" onSubmit={submit}><label>Property name<input name="name" defaultValue={property.name || ''} required /></label><div className="admin-form-row"><label>Location<input name="location" defaultValue={property.location || property.address || ''} placeholder="Neighbourhood or area" required /></label><label>Property type<input name="property_type" defaultValue={property.property_type || property.type || ''} required /></label></div><label>Full property address<input name="address" defaultValue={property.address || property.location || ''} placeholder="Street, area, city, postal code" /></label><label>Google Maps embed URL<input name="map_url" type="url" defaultValue={property.map_url || ''} placeholder="https://www.google.com/maps/embed?pb=…" /></label><label>Property contact phone<input name="contact_phone" type="tel" defaultValue={property.contact_phone || ''} placeholder="+91 98765 43210" /></label><div className="admin-form-row"><label>Price<input name="price" defaultValue={property.price || ''} required /></label><label>Area<input name="area" defaultValue={property.area || ''} /></label></div><label>Configuration<input name="configuration" defaultValue={property.configuration || ''} placeholder="e.g. 2 & 3 BHK" /></label><label>Property image<input name="image_file" type="file" accept="image/*" /></label><label>Or image URL<input name="image_url" type="url" defaultValue={property.image_url || property.image || ''} placeholder="https://…" /></label><label>Description<textarea name="description" rows="3" defaultValue={property.description || ''} /></label><label>Amenities, comma separated<input name="amenities" defaultValue={Array.isArray(property.amenities) ? property.amenities.join(', ') : property.amenities || ''} /></label><label>Status<select name="status" defaultValue={property.status || 'ACTIVE'}><option value="ACTIVE">Published</option><option value="INACTIVE">Unpublished</option></select></label>{error && <p className="admin-error" role="alert">{error}</p>}<div className="admin-editor-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button><button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save property'}</button></div></form></section></div>
}

function activeTitle(section) {
  if (section === 'dashboard') return 'Overview'
  if (section === 'properties') return 'Properties'
  return sectionNames[section] || 'Overview'
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString() : '—'
}
