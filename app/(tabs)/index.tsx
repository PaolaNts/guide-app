import React from 'react';
import { View } from 'react-native';

// Aqui estamos a importar o teu componente Login da pasta src
import Login from '../../src/login';

export default function Index() {
  return (
    // Exibimos o Login diretamente na tela inicial
    <View style={{ flex: 1 }}>
      <Login />
    </View>
  );
}