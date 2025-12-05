import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFonts } from 'expo-font'
import { globalStyles } from "../../mystyles/global";







export default function Home() {
  async function handleLogout() {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }
  const [loaded] = useFonts({
    Inter: require('../../assets/fonts/static/Inter_28pt-Regular.ttf'),
  })

  return (
    <View style={styles.base}>
    <View style={styles.container}>

      <Text style={styles.texth1}>Vamos Personalizar o seu perfil</Text>
      <Text style={styles.texth2}>Vamos Personalizar o seu perfil</Text>
      <TextInput style={globalStyles.input}
      underlineColorAndroid="transparent"
      
      >
        
      </TextInput>

      </View>
      
    </View>
  );
}
//<TouchableOpacity onPress={handleLogout}>
 //       <Text>Sair</Text>
 //     </TouchableOpacity>

const styles = StyleSheet.create({

  texth1:{
    color:'white',
    fontFamily:'Inter',
    fontSize:20,
  },
  texth2:{
    color:'white',
  },
    base:{
    flex:1,
  },
  container:{
    flex:1,
    padding:40,
    backgroundColor:"pink",
    alignItems:'center'
  
  },

 
});
