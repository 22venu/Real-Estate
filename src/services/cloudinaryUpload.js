const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadPropertyImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    const error = new Error('Set the Cloudinary cloud name and unsigned upload preset in .env.local.')
    error.code = 'cloudinary/not-configured'
    throw error
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'property-images')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    const error = new Error(result.error?.message || 'Cloudinary rejected the image upload.')
    error.code = `cloudinary/${response.status}`
    throw error
  }

  return {
    imageUrl: result.secure_url,
    imagePublicId: result.public_id,
  }
}
