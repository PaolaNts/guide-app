import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { router } from 'expo-router';

import { 
  getAuth, 
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';

import { app } from '../../src/firebaseConfig'; 
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function Login() {

  // Estados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth(app);
  

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Erro', 'Por favor, preenche todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
       Alert.alert(
          'Email não confirmado',
          'Verifique sua caixa de entrada ou spam.',
          [
            {
              text: 'Reenviar email',
              onPress: async () => {
                await sendEmailVerification(user)
                Alert.alert('Pronto', 'Email reenviado.')
              }
            },
            {
              text: 'Cancelar',
              style: 'cancel'
            }
          ]
        )
        return
      }

      await AsyncStorage.setItem("userId", user.uid);

      Alert.alert('Sucesso!', `Bem-vindo de volta, ${user.email}`);
      router.replace("/");



    } catch (error: any) {

      let errorMessage = 'Ocorreu um erro ao fazer login.';

      if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Utilizador não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'A senha está incorreta.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciais inválidas.';
      }

      Alert.alert('Erro de Login', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToForgotPassword = () => {
    router.push('./forgotpassword'); 
  };

  const handleGoToSignUp = () => {
    router.push('./signup'); 
  };

  return (
    <LinearGradient
      colors={['#8b83e4', '#763779']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Fazer login</Text>

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
          <Text style={{color: 'white', textAlign: 'center', fontWeight: 'bold', marginBottom:10}}>
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
          <Text style={{color: 'white', textAlign: 'center', marginBottom: 5 }}>
          Ainda não tem uma conta?
        </Text>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Criar conta agora
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  criarconta:{
    flexDirection: 'row',
    justifyContent:'center'
  },
    criarconta2:{
    flexDirection: 'row',
    
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
  borderWidth: 2,               // ← TAMANHO da borda
  borderColor: '#ffffffff', 
},

btnLoginText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
});
