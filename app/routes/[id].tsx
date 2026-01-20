import { View, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function RouteDetails() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>
        Detalhes da rota
      </Text>

      <Text style={{ marginTop: 12 }}>
        ID da rota: {id}
      </Text>

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
