'use client'
import { useState, useRef } from "react"
import { StyleSheet, TextInput, View, Text, TouchableOpacity, Modal, FlatList } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useFonts } from 'expo-font'
import { globalStyles } from "../../mystyles/global"
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckIcon } from '@gluestack-ui/themed'
import { LinearGradient } from 'expo-linear-gradient'
import { getAuth } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { app } from '../../src/firebaseConfig'




const options = [
  { id: '1', label: 'Turismo cultural' },
  { id: '2', label: 'Enoturismo' },
  { id: '3', label: 'Turismo gastronômico' },
  { id: '4', label: 'Turismo histórico' },
  { id: '5', label: 'Turismo religioso' },
  { id: '6', label: 'Turismo de aventura' },
  { id: '7', label: 'Ecoturismo' },
  { id: '8', label: 'Turismo rural' },
  { id: '9', label: 'Turismo de natureza' },
  { id: '10', label: 'Turismo esportivo' },
  { id: '11', label: 'Turismo de sol e praia' },
  { id: '12', label: 'Turismo de negócios' },
  { id: '13', label: 'Turismo de eventos' },
  { id: '14', label: 'Turismo de saúde' },
  { id: '15', label: 'Turismo de bem-estar' },
  { id: '16', label: 'Turismo de luxo' },
  { id: '17', label: 'Turismo comunitário' },
  { id: '18', label: 'Turismo sustentável' },
  { id: '19', label: 'Turismo científico' },
  { id: '20', label: 'Turismo pedagógico' },
  { id: '21', label: 'Turismo industrial' },
  { id: '22', label: 'Turismo náutico' },
  { id: '23', label: 'Turismo urbano' },
  { id: '24', label: 'Turismo cinematográfico' },
  { id: '25', label: 'Turismo de compras' },
]

type MapboxFeature = {
  id: string
  text: string
  place_type: string[]
  context?: {
    id: string
    text: string
    short_code?: string
  }[]
}

export default function Home() {
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MapboxFeature[]>([])
  const [name, setName] = useState('')


  const debounceRef = useRef<any>(null)

  const [loaded] = useFonts({
    Inter: require('../../assets/fonts/static/Inter_28pt-Regular.ttf'),
  })

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(i => i !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  async function search(text: string) {
    setQuery(text)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.length < 3) {
      setResults([])
      return
    }

    

  
  }
  const saveProfile = async () => {
  const auth = getAuth(app)
  const user = auth.currentUser

  if (!user) return

  if (!name || selected.length === 0) return

  const db = getFirestore(app)

  await setDoc(doc(db, 'users', user.uid), {
    name,
    segments: selected,
    createdAt: new Date()
  })

  router.push('/custom/neew')
}


  return (
    <View style={styles.base}>
      <LinearGradient
        colors={['#8b83e4', '#763779']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.container}>
          <Text style={styles.texth1}>VAMOS PERSONALIZAR O SEU PERFIL</Text>

          <Text style={styles.texth2}>Seu nome completo</Text>
          <TextInput  style={globalStyles.input} value={name} onChangeText={setName} />

          <Text style={styles.texth2}>Escolha seu segmento</Text>

          <TouchableOpacity onPress={() => setOpen(true)} style={styles.segmento}>
            <Text style={styles.texth3}>
              {selected.length === 0
                ? 'Selecionar...'
                : options.filter(o => selected.includes(o.id)).map(o => o.label).join(', ')
              }
            </Text>
          </TouchableOpacity>

          <Modal visible={open} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <FlatList
                  data={options}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const checked = selected.includes(item.id)

                    return (
                      <TouchableOpacity
                        onPress={() => toggle(item.id)}
                        style={[
                          styles.optionRow,
                          checked && styles.optionRowSelected
                        ]}
                      >
                        <Checkbox
                          value={item.id}
                          isChecked={checked}
                          onChange={() => toggle(item.id)}
                        >
                          <CheckboxIndicator>
                            <CheckboxIcon as={CheckIcon} />
                          </CheckboxIndicator>
                        </Checkbox>

                        <Text
                          style={[
                            styles.optionText,
                            checked && styles.optionTextSelected
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  }}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setSelected([])}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearText}>Limpar seleção</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setOpen(false)}
                    style={styles.confirmButton}
                  >
                    <Text style={styles.confirmText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>


      
          <TouchableOpacity style={globalStyles.btnLogin} onPress={saveProfile}>
            <Text style={globalStyles.btnLoginText}>Continuar</Text>
          </TouchableOpacity>

        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  container: {
    flex: 1,
    padding: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texth1: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 10,
  },
  texth2: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  texth3: { color: 'white' },
  segmento: {
  width: '100%',
  borderColor: 'white',
  borderBottomWidth: 2,
  paddingVertical: 10,
  paddingHorizontal: 4,
  minHeight: 40,
  justifyContent: 'center',
},
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#1D4ED8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  confirmText: {
    color: '#ffffff',
    textAlign: 'center',
  },

  dropdown: {
    width: '95%',
    backgroundColor: '#e26c6c',
    borderRadius: 8,
    maxHeight: 180,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f02525',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  optionRowSelected: {
  backgroundColor: '#EEF2FF',
  borderRadius: 8,
  paddingHorizontal: 8,
},

optionTextSelected: {
  fontWeight: '600',
},

modalActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 12,
},

clearButton: {
   backgroundColor: '#d81d1d',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,

},

clearText: {
  color: '#ffffff',
  fontWeight: '500',
},

})
