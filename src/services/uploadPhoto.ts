import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebaseConfig'

export const uploadPhoto = async (uri: string, userId: string) => {
  const response = await fetch(uri)
  const blob = await response.blob()

  const photoRef = ref(
    storage,
    `photos/${userId}/${Date.now()}.jpg`
  )

  await uploadBytes(photoRef, blob)
}
