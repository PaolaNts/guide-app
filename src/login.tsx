import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  Alert, 
  ActivityIndicator 
} from 'react-native';

// Importa a função de autenticação do Firebase
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Importa a configuração que tu já criaste
// ATENÇÃO: Verifica se o caminho '../firebaseConfig' está correto para a tua estrutura de pastas
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
      Alert.alert('Sucesso!');
      console.log('Login realizado com sucesso:', user.uid);
      
      // Aqui tu poderias redirecionar para a Home, por exemplo:
      // navigation.navigate('Home');

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
        autoCapitalize="none" // Importante para emails
      />

      {/* Campo de Senha */}
      <TextInput
        style={styles.input}
        placeholder="Digite a sua senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true} // Oculta a senha
      />

      {/* Botão de Login ou Indicador de Carregamento */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Entrar" onPress={handleLogin} />
      )}
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