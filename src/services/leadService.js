export async function submitLead({ kind, name, phone, email, message, property, preferredDate, preferredTime }) {
  const { db, firebaseConfigured } = await import('../lib/firebase.js')
  if (!firebaseConfigured) throw new Error('The contact form is not connected yet.')

  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
  const collectionName = kind === 'visit' ? 'site_visits' : kind === 'call' ? 'call_requests' : 'enquiries'
  const request = {
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    property_name: property || '',
    message: message.trim(),
    status: kind === 'visit' ? 'REQUESTED' : 'NEW',
    created_at: serverTimestamp(),
  }

  if (kind === 'visit') {
    request.visit_date = preferredDate
    request.visit_time = preferredTime
  } else if (kind === 'call') {
    request.preferred_date = preferredDate
    request.preferred_time = preferredTime
  }

  await addDoc(collection(db, collectionName), request)
}

export async function fetchPublishedProperties() {
  const { db, firebaseConfigured } = await import('../lib/firebase.js')
  if (!firebaseConfigured) return null

  const { collection, getDocs, query, where } = await import('firebase/firestore')
  const snapshot = await getDocs(query(collection(db, 'properties'), where('status', '==', 'ACTIVE')))
  return snapshot.docs.map((item) => {
    const property = item.data()
    return {
      id: item.id,
      slug: property.slug || item.id,
      name: property.name || 'Residence',
      type: property.property_type || property.type || 'Residence',
      location: property.location || property.address || '',
      address: property.address || property.location || '',
      map_url: property.map_url || '',
      contact_phone: property.contact_phone || '',
      configuration: property.configuration || property.bedrooms || '',
      area: property.area || '',
      price: property.price || 'Contact for price',
      image: property.image_url || property.image || '',
      alt: property.name || 'Meridian Estates residence',
      description: property.description || '',
      amenities: property.amenities || [],
    }
  })
}

export async function fetchPublicSettings() {
  const { db, firebaseConfigured } = await import('../lib/firebase.js')
  if (!firebaseConfigured) return null

  const { doc, getDoc } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(db, 'site_settings', 'public'))
  return snapshot.exists() ? snapshot.data() : null
}
