import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

export async function resetPassword(email: string) {
  if (!email) {
    throw new Error('EMAIL_REQUIRED')
  }

  const auth = getAuth()
  await sendPasswordResetEmail(auth, email.trim())
}
