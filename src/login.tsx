import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity // Adicionamos este import!
} from 'react-native';

import { router } from 'expo-router'; // Adicionamos este import para navegação!

// Importa a função de autenticação do Firebase
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Importa a configuração que tu já criaste
import { app } from './firebaseConfig'; 

export default function Login() {
  // 1. Definição dos estados para armazenar os dados dos inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicializa a autenticação
  const auth = getAuth(app);

  // 2. Função que lida com o processo de login
  const handleLogin = async () => {
    // Validação simples para ver se os campos não estão vazios
    if (email === '' || password === '') {
      Alert.alert('Erro', 'Por favor, preenche todos os campos.');
      return;
    }

    setLoading(true);

    try {
      // 3. Chama o Firebase para tentar fazer login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Se chegar aqui, o login funcionou!
      Alert.alert('Sucesso!', `Bem-vindo de volta, ${user.email}`);
      console.log('Login realizado com sucesso:', user.uid);
      
      // ************************************************************
      // AQUI É ONDE COLOCAMOS O CÓDIGO PARA REDIRECIONAR PARA A HOME
      // ************************************************************
      // router.replace('/home'); // Assumindo que criaste uma rota chamada 'home'
      
    } catch (error: any) {
      // 4. Tratamento de erros (senha errada, email não existe, etc)
      console.error(error);
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

  // Função para navegar para o cadastro
  const handleGoToSignUp = () => {
    // Usamos o router para empurrar a rota '/signup' para a pilha de navegação
    router.push('/singup'); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acesso ao Sistema</Text>

      {/* Campo de Email */}
      <TextInput
        style={styles.input}
        placeholder="Digite o seu email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Campo de Senha */}
      <TextInput
        style={styles.input}
        placeholder="Digite a sua senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
      />

      {/* Botão de Login ou Indicador de Carregamento */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Entrar" onPress={handleLogin} />
      )}

      {/* NOVO CÓDIGO: Botão para ir para a tela de Cadastro */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ textAlign: 'center', marginBottom: 5 }}>Ainda não tem uma conta?</Text>
        <TouchableOpacity onPress={handleGoToSignUp}>
          <Text style={{ color: 'blue', textAlign: 'center', fontWeight: 'bold' }}>
            Criar conta agora
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Estilos simples para organizar a tela
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
});