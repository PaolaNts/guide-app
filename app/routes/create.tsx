import { View, TextInput, TouchableOpacity, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../src/firebaseConfig'

export default function CreateRoute() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')

  async function saveRoute() {
    if (!name || !city) return

    await addDoc(collection(db, 'routes'), {
      name,
      city,
      createdAt: serverTimestamp()
    })

    router.back()
  }

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Nome da rota"
        value={name}
        onChangeText={setName}
        style={{ borderBottomWidth: 1, marginBottom: 16 }}
      />

      <TextInput
        placeholder="Cidade"
        value={city}
        onChangeText={setCity}
        style={{ borderBottomWidth: 1, marginBottom: 24 }}
      />

      <TouchableOpacity onPress={saveRoute}>
        <Text>Salvar rota</Text>
      </TouchableOpacity>
            <TouchableOpacity
        onPress={() => router.push(`/(tabs)/rotas`)}
        style={{
          marginTop: 24,
          backgroundColor: '#4F46E5',
          padding: 14,
          borderRadius: 10
        }}
      >
        <Text style={{ color: '#FFF', textAlign: 'center' }}>
          Voltar
        </Text>
      </TouchableOpacity>
    </View>
  )
}
