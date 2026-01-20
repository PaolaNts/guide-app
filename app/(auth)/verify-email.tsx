import { auth } from '@/src/firebaseConfig'
import { sendEmailVerification } from 'firebase/auth'
import { Alert, Text, TouchableOpacity, View,StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { globalStyles } from '@/mystyles/global'
import { LinearGradient } from 'expo-linear-gradient';

export default function VerifyEmail() {
  const user = auth.currentUser

  const resendEmail = async () => {
    if (!user) return

    await sendEmailVerification(user)
    Alert.alert('Email reenviado', 'Confira sua caixa de entrada.')
  }

  const checkVerification = async () => {
    await user?.reload()

    if (user?.emailVerified) {
      router.replace('/(auth)/login')
    } else {
      Alert.alert('Ainda não confirmado', 'Verifique seu email.')
    }
  }

  return (
     <LinearGradient
                colors={['#8b83e4', '#763779']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
                >
        <View style={{ flex:1, justifyContent:'center', alignItems:'center', width:'90%'}}>
        <Text style={{    color: 'white',fontFamily: 'Inter', fontSize: 18,fontWeight:'600',paddingBottom: 10,}}>Verifique seu spam ou sua</Text>
        <Text style={{    color: 'white',fontFamily: 'Inter', fontSize: 18,fontWeight:'600',paddingBottom: 10,}}>caixa de entrada no seu email</Text>

        <TouchableOpacity onPress={resendEmail} style={globalStyles.btnLogin}>
            <Text style={globalStyles.btnLoginText}>Reenviar email</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={checkVerification}  style={globalStyles.btnLogin}>
            <Text style={globalStyles.btnLoginText}>Já confirmei</Text>
        </TouchableOpacity>
        </View>
        </LinearGradient>
  )
}
  const styles = StyleSheet.create({
    container:{
    flex: 1,
    alignItems:'center'
    },

})