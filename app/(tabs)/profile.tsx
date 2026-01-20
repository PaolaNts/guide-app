import {
  Avatar,
  AvatarImage
} from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { User } from 'lucide-react-native';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../src/firebaseConfig';



export default function Profile() {
  const handleLogout = async () => {
    try {
      await signOut(auth)

      await AsyncStorage.multiRemove([
        'token',
        'userId'
      ])

      router.replace('/login')
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sair da conta')
    }
  }
  return (
     <View style={{flex:1,}}>
      
      <LinearGradient
                  colors={['#87a2eb', '#c581c9']} 
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.container}
                  >

        <Text style={styles.textH1}>Perfil</Text>
      <Avatar size="xl" style={{marginTop:20, borderWidth:3, borderColor:'white',backgroundColor:'#d3d3d3'}}>
        <Icon as={User} size="xl" className="stroke-white" />
        <AvatarImage
        />
      </Avatar>
      </LinearGradient>
      <View style={{flex:1, width:'100%',alignItems:'center',}}>
      <TouchableOpacity style={styles.btnprofile} onPress={handleLogout}>
        Sair
      </TouchableOpacity>

      </View>
      
      
    </View>
  
  )
}

const styles = StyleSheet.create ({
textH1:{
  fontFamily: 'Inter',
  fontWeight:'600',
  fontSize:24,
  color:'white',
  marginTop:20,
},
container:{
  height:'30%',
  alignItems:'center',
},
btnprofile:{
 borderRadius: 12,
 backgroundColor:'grey',
 padding:10,
 alignItems:'center',
 fontFamily:'Inter',
 fontWeight:400,
 fontSize:16,
 width:'90%',
 marginTop:10,


},

})