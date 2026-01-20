import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({

input: {
    
    width:'100%',
    height: 40,
    borderColor: 'white',
    borderBottomWidth: 2,
    backgroundColor: 'transparent',
    marginTop: 20,
    
  },
btnLogin: {
  width:'100%',
  paddingVertical: 14,
  borderRadius: 20,
  alignItems: 'center',
  marginTop: 20,
  borderWidth: 2,               // ← TAMANHO da borda
  borderColor: '#ffffffff', 
},

btnLoginText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
    container2: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },

  container: {
    flex: 1,
    padding: 10,
    width:'100%',
    alignItems: 'center',
    justifyContent:'center',
  },
  base:{
    flex:1,
  },
    texth1: {
    color: 'white',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight:'600',
    paddingBottom: 10,
  },
  texth2: {
    color: 'white',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight:'300',
    paddingBottom: 10,
  },

})