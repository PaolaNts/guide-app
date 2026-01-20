import { View, Text, FlatList, TouchableOpacity,StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../src/firebaseConfig'
import { Ionicons } from '@expo/vector-icons'

type Route = {
  id: string
  name: string
  city: string
}

export default function Routes() {
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'routes'), snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Route, 'id'>)
      }))
      setRoutes(data)
    })

    return () => unsub()
  }, [])

  if (routes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Você ainda não criou nenhuma rota
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/routes/create')}
        >
          <Text style={styles.primaryButtonText}>
            Criar nova rota
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{flex:1,padding:10,}}>
        <TouchableOpacity onPress={() => router.push('/routes/create')}>
            <Ionicons name="add-circle-outline" size={40} color={'black'} />
        </TouchableOpacity>
        <FlatList
        data={routes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}
             onPress={() => router.push(`/routes/${item.id}`)}
            >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.city}</Text>
            </TouchableOpacity>
        )}
        />
    </View>
  )
}

const styles = StyleSheet.create  ({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 16,
    color: '#374151',
    textAlign: 'center'
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  list: {
    padding: 16
  },
  card: {
    backgroundColor: '#e2e2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#6B7280'
  }
})
