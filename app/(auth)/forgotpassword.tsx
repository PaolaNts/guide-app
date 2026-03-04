import { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { resetPassword } from '../../src/services/contexts/resetPassword'
import { LinearGradient } from 'expo-linear-gradient'
import { globalStyles } from '@/mystyles/global'
import { useFonts } from 'expo-font'
import { Icon, ArrowLeftIcon } from '@/components/ui/icon'
import { router } from 'expo-router'
import { Snackbar } from 'react-native-paper'

export default function ForgotPassword() {

  const [email, setEmail] = useState<string>('')

  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  async function handleReset() {
    try {
      await resetPassword(email)

      // Mensagem recomendada (por segurança, não confirma existência do usuário)
      setMessage("Se esse email estiver cadastrado, você vai receber um link em instantes.")
      setVisible(true)

    } catch (e: any) {
      console.log("RESET PASSWORD ERROR:", e?.code, e?.message, e)

      if (e?.code === "EMAIL_REQUIRED") {
        setMessage("Digite seu email.")
      } else if (e?.code === "auth/invalid-email") {
        setMessage("Email inválido.")
      } else if (e?.code === "auth/user-not-found") {
        setMessage("Email não cadastrado.")
      } else if (e?.code === "auth/too-many-requests") {
        setMessage("Muitas tentativas. Tente novamente mais tarde.")
      } else if (e?.code === "auth/network-request-failed") {
        setMessage("Falha de conexão. Verifique sua internet.")
      } else if (e?.code === "auth/operation-not-allowed") {
        setMessage("Login por Email/Senha não está habilitado no Firebase.")
      } else {
        setMessage("Não foi possível enviar o email. Tente novamente.")
      }

      setVisible(true)
    }
  }
  const [loaded] = useFonts({
    Inter: require('../../assets/fonts/static/Inter_28pt-Regular.ttf'),
  })

  const handleback = () => {
    router.push('./login')
  }

  return (
    <LinearGradient
      colors={['#8b83e4', '#763779']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >

      <View style={{ width: '100%' }}>
        <TouchableOpacity style={styles.buttonback} onPress={handleback}>
          <Icon as={ArrowLeftIcon} size="xl" color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.back}>

        <Text style={globalStyles.texth1}>
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </Text>

        <TextInput
          style={globalStyles.input}
          placeholder="Digite seu email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TouchableOpacity
          onPress={handleReset}
          style={globalStyles.btnLogin}
        >
          <Text style={styles.texth2}>Recuperar senha</Text>
        </TouchableOpacity>

      </View>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        {message}
      </Snackbar>

    </LinearGradient>
  )
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    alignItems: 'center',
  },

  buttonback: {
    width: '100%',
    padding: 14,
  },

  back: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
  },

  texth2: {
    fontFamily: 'Inter',
    color: '#fff',
    fontSize: 16,
    fontWeight: '300',
    padding: 5,
    textAlign: 'center',
  },

})