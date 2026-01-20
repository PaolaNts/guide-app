import { router } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { app } from '../../src/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../src/firebaseConfig'
import { sendEmailVerification } from 'firebase/auth'



export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');  // <-- ADICIONADO
  const [loading, setLoading] = useState(false);

  const auth = getAuth(app);

  const handleSignUp = async () => {
    if (email === '' || password === '' || confirmPassword === '') {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    // 🔥 Validação das senhas iguais
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await sendEmailVerification(user)

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        emailVerified: false,
        createdAt: new Date(),
      })

      Alert.alert(
        'Verifique seu email',
        'Enviamos um link para confirmar sua conta.'
      )

      router.replace('/verify-email')

    } catch (error: any) {
      let errorMessage = 'Erro ao criar conta.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Formato de email inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      }

      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

    const handleGoToLogin = () => {
      router.push('./login'); 
    };
  return (
    <LinearGradient
      colors={['#763779', '#8b83e4']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Criar Nova Conta</Text>



        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha (mín. 6 caracteres)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 🔥 Campo de confirmação de senha */}
        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
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

        <TouchableOpacity onPress={handleGoToLogin} style={{ marginTop: 20 }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>
            Já tenho conta. Fazer Login.
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    btnSignup: {
  
  paddingVertical: 14,
  borderRadius: 20,
  alignItems: 'center',
  marginTop: 10,
  borderWidth: 2,               // ← TAMANHO da borda
  borderColor: '#ffffffff', 
},
btnSignupText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
});
