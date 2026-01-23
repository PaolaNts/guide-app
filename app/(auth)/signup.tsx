import { router } from 'expo-router'
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification } from 'firebase/auth'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { app, db } from '../../src/firebaseConfig'
import { LinearGradient } from 'expo-linear-gradient'
import { doc, setDoc } from 'firebase/firestore'


export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const auth = getAuth(app)
  const isStrongPassword = (password: string) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return regex.test(password)
  }


  const handleSignUp = async () => {
    setError('')
    setInfo('')

    if (!email || !password || !confirmPassword) {
      setError('Preencha todos os campos.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (!isStrongPassword(password)) {
      setError(
        'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'
      )
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      setInfo('Conta criada! Verifique seu email.')

      sendEmailVerification(user).catch(() => {})

      setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        emailVerified: false,
        createdAt: new Date(),
      }).catch(() => {})

      router.replace('/verify-email')
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.')
      } else if (error.code === 'auth/weak-password') {
        setError('Senha fraca.')
      } else {
        setError('Erro ao criar conta.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoToLogin = () => {
    router.push('./login')
  }

  return (
    <LinearGradient
      colors={['#763779', '#8b83e4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.container}>
        <Text style={styles.title}>CRIAR NOVA CONTA</Text>

        {error !== '' && (
          <Text style={{ color: '#ffb3b3', textAlign: 'center', marginBottom: 10 }}>
            {error}
          </Text>
        )}

        {info !== '' && (
          <Text style={{ color: '#b3e5ff', textAlign: 'center', marginBottom: 10 }}>
            {info}
          </Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#ddd"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#ddd"
          value={password}
          onChangeText={(text) => {
              setPassword(text)
              if (error) setError('')
            }}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
          placeholderTextColor="#ddd"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <TouchableOpacity style={styles.btnSignup} onPress={handleSignUp}>
            <Text style={styles.btnSignupText}>Confirmar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleGoToLogin} style={{ marginTop: 20, flexDirection:'row', gap:5, justifyContent:'center'}}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight:'400' }}>
            Já tem conta?
          </Text>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight:'600' }}>
            Fazer Login
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily:'Inter'
  },
  input: {
    color: '#fff',
    height: 50,
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 20,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  btnSignup: {
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#ffffffff',
  },
  btnSignupText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
