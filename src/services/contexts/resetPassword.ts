import { getAuth, sendPasswordResetEmail } from "firebase/auth"

export async function resetPassword(email: string) {
  const trimmed = email.trim()

  if (!trimmed) {
    const err: any = new Error("EMAIL_REQUIRED")
    err.code = "EMAIL_REQUIRED"
    throw err
  }

  const auth = getAuth()
  return sendPasswordResetEmail(auth, trimmed)
}