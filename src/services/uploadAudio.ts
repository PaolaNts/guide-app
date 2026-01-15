import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebaseConfig'

export const uploadAudio = async (uri: string, userId: string) => {
  const response = await fetch(uri)
  const blob = await response.blob()

  const audioRef = ref(
    storage,
    `audios/${userId}/${Date.now()}.mp3`
  )

  await uploadBytes(audioRef, blob)
}
