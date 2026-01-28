import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal } from 'react-native'
import { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/src/firebaseConfig'

type BlockType = 'title' | 'text' | 'description'

type Block = {
  id: string
  type: BlockType
  content: string
}

export default function EditRoute() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getAuth().currentUser
    if (!user || !id) return

    getDoc(doc(db, 'users', user.uid, 'routes', id)).then(snapshot => {
      if (snapshot.exists()) {
        setBlocks(snapshot.data().blocks)
      }
      setLoading(false)
    })
  }, [])

  function addBlock(type: BlockType) {
    setBlocks(prev => [
      ...prev,
      { id: Date.now().toString(), type, content: '' }
    ])
  }

  function updateBlock(blockId: string, value: string) {
    setBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, content: value } : b))
    )
  }

  function removeBlock(blockId: string) {
    setBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    setBlocks(prev => {
      const newBlocks = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev

      const temp = newBlocks[index]
      newBlocks[index] = newBlocks[targetIndex]
      newBlocks[targetIndex] = temp

      return newBlocks
    })
  }

  async function saveRoute() {
    const user = getAuth().currentUser
    if (!user || !id) return

    if (blocks.length === 0) return

    await updateDoc(
      doc(db, 'users', user.uid, 'routes', id),
      {
        blocks,
        updatedAt: serverTimestamp()
      }
    )

    router.back()
  }

  if (loading) return null

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Editar rota</Text>

      <FlatList
        data={blocks}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Adicione blocos para montar sua rota</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <View style={styles.moveButtons}>
                <TouchableOpacity onPress={() => moveBlock(index, 'up')}>
                  <Ionicons name="chevron-up" size={20} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => moveBlock(index, 'down')}>
                  <Ionicons name="chevron-down" size={20} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => removeBlock(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder={
                item.type === 'title'
                  ? 'Título'
                  : item.type === 'description'
                  ? 'Descrição'
                  : 'Texto'
              }
              value={item.content}
              onChangeText={text => updateBlock(item.id, text)}
              style={[
                styles.input,
                item.type === 'title' && styles.titleInput,
                item.type === 'description' && styles.descriptionInput
              ]}
              multiline
            />
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.addBlock}
        onPress={() => setShowOptions(true)}
      >
        <Text style={styles.addBlockText}>Adicionar bloco</Text>
      </TouchableOpacity>

      <Modal transparent visible={showOptions} animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.modal}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                addBlock('title')
                setShowOptions(false)
              }}
            >
              <Text>Título</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                addBlock('text')
                setShowOptions(false)
              }}
            >
              <Text>Texto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                addBlock('description')
                setShowOptions(false)
              }}
            >
              <Text>Descrição</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity style={styles.save} onPress={saveRoute}>
        <Text style={styles.saveText}>Salvar alterações</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text>Voltar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12
  },
  empty: {
    color: '#6B7280',
    marginTop: 20
  },
  block: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 10
  },
  input: {
    fontSize: 16
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600'
  },
  descriptionInput: {
    color: '#6B7280'
  },
  addBlock: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 10,
    marginTop: 10
  },
  addBlockText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600'
  },
  save: {
    backgroundColor: '#22C55E',
    padding: 14,
    borderRadius: 10,
    marginTop: 16
  },
  saveText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600'
  },
  back: {
    marginTop: 16,
    alignItems: 'center'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  option: {
    padding: 14
  }
})
