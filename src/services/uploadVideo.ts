import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebaseConfig'

export const uploadVideo = async (uri: string, userId: string) => {
  const response = await fetch(uri)
  const blob = await response.blob()

  const videoRef = ref(
    storage,
    `videos/${userId}/${Date.now()}.mp4`
  )

  await uploadBytes(videoRef, blob)
}
