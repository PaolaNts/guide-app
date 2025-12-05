import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({

input: {
    
    width:'100%',
    height: 40,
    borderColor: 'white',
    borderBottomWidth: 2,
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
})