import React, { useState } from 'react'
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { 
  getAuth, 
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth'
import { app } from '../../src/firebaseConfig' 
import AsyncStorage from "@react-native-async-storage/async-storage"

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')


  const auth = getAuth(app)

  const handleLogin = async () => {
    setError('')
    setInfo('')

    if (email === '' || password === '') {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (!user.emailVerified) {
        setInfo('Verifique seu email antes de entrar.')
        return
      }

      await AsyncStorage.setItem("userId", user.uid)
      router.replace("/(tabs)/home")

    } catch (error: any) {
      if (error.code === 'auth/invalid-email') {
        setError('O formato do email é inválido.')
      } else if (error.code === 'auth/user-not-found') {
        setError('Utilizador não encontrado.')
      } else if (error.code === 'auth/wrong-password') {
        setError('A senha está incorreta.')
      } else if (error.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas.')
      } else {
        setError('Ocorreu um erro ao fazer login.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoToForgotPassword = () => {
    router.push('./forgotpassword') 
  }

  const handleGoToSignUp = () => {
    router.push('./signup') 
  }

  return (
    <LinearGradient
      colors={['#8b83e4', '#763779']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>FAZER LOGIN</Text>
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
        placeholder="Digite o seu email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Digite a sua senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry 
      />

      <TouchableOpacity onPress={handleGoToForgotPassword} style={styles.criarconta2}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>
          Esqueci minha senha
        </Text>
      </TouchableOpacity>  

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <TouchableOpacity style={styles.btnLogin} onPress={handleLogin}>
          <Text style={styles.btnLoginText}>Entrar</Text>
        </TouchableOpacity>
      )}

      <View style={{ marginTop: 20 }}>
        <TouchableOpacity onPress={handleGoToSignUp} style={styles.criarconta}>
          <Text style={{ color: 'white', textAlign: 'center', marginBottom: 5 }}>
            Ainda não tem uma conta?
          </Text>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Criar conta agora
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  criarconta:{
    flexDirection: 'row',
    justifyContent:'center',
    gap:5,
  },
  criarconta2:{
    flexDirection: 'row'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color:'#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily:'Inter'
  },
  input: {
    color:'#fff',
    height: 50,
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 20,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  btnLogin: {
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#ffffffff', 
  },
  btnLoginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
