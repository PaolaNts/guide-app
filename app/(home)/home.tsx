'use client'
import { useState } from "react"
import { StyleSheet, TextInput, View, Text, TouchableOpacity, Modal, FlatList } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useFonts } from 'expo-font'
import { globalStyles } from "../../mystyles/global"
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckIcon } from '@gluestack-ui/themed'
import { LinearGradient } from 'expo-linear-gradient';

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


export default function Home() {
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(i => i !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("token")
    router.replace("/login")
  }

  const [loaded] = useFonts({
    Inter: require('../../assets/fonts/static/Inter_28pt-Regular.ttf'),
  })

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimItem[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')

  type NominatimItem = {
    display_name: string
    address: {
      city?: string
      town?: string
      village?: string
      county?: string
      state?: string
      region?: string
      state_district?: string
      country?: string
    }
  }

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) return setResults([])
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&addressdetails=1&limit=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'app-example' }
    })
    const data = await res.json()
    setResults(data)
  }

  function formatAddress(item: NominatimItem) {
    const city =
      item.address.city ||
      item.address.town ||
      item.address.village ||
      item.address.county

    const state =
      item.address.state ||
      item.address.region ||
      item.address.state_district

    const country = item.address.country

    return [city, state, country].filter(Boolean).join(', ')
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
        <TextInput style={globalStyles.input} />

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
            <View style={[
              styles.modalSheet,
              selected.length > 0 && styles.modalSheetHasSelection
            ]}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Escolha seu segmento</Text>
                {selected.length > 0 ? (
                  <Text style={styles.modalSelectedCount}>{selected.length} selecionado(s)</Text>
                ) : null}
              </View>

              <FlatList
                data={options}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    style={[
                      styles.optionRow,
                      selected.includes(item.id) && styles.optionRowSelected
                    ]}
                  >
                    <Checkbox
                      value={item.id}
                      isChecked={selected.includes(item.id)}
                      onChange={() => toggle(item.id)}
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon} />
                      </CheckboxIndicator>
                    </Checkbox>

                    <Text style={[
                      styles.optionText,
                      selected.includes(item.id) && styles.optionTextSelected
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => { setSelected([]) }} style={styles.clearButton}>
                  <Text style={styles.clearText}>Limpar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setOpen(false)} style={styles.confirmButton}>
                  <Text style={styles.confirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
        <Text style={styles.texth2}>Digite a sua região de atuação</Text>
        <TextInput
          value={query}
          onChangeText={search}
          style={ styles.inputRegion }
        />

        {results.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={results}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    const fmt = formatAddress(item)
                    setSelectedRegion(fmt)
                    setQuery(fmt)
                    setResults([])
                  }}
                >
                  <Text style={styles.dropdownItemText}>{formatAddress(item)}</Text>

                </TouchableOpacity>
                )}
              />
          </View>
        )}

        
      </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  texth1: {
    color: 'white',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight:'600',
    paddingBottom: 10,
  },
  texth2: {
    fontSize:16,
    color: 'white',
    fontWeight:'400',
    fontFamily:'Inter',
    marginTop: 10,
  },
    texth3: {
      
    color: 'white',
  },
  base: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 10,
    width:'100%',
    alignItems: 'center'
  },

  
  segmento:{
    color:'white',
    height: 40,
    width:'100%',
    borderColor: 'white',
    borderBottomWidth: 2,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },


  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.45)',
},

modalSheet: {
  width: '90%',         // ocupa a largura que quiser
  maxHeight: '70%',
  backgroundColor: '#fff',
  borderRadius: 14,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 12,
},

modalSheetHasSelection: {
  borderWidth: 2,
  borderColor: '#1D4ED8'  // destaque quando há seleção
},

modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},

modalTitle: {
  fontSize: 16,
  fontWeight: '600',
},

modalSelectedCount: {
  fontSize: 13,
  color: '#1D4ED8',
},

optionRow: {
  color:'red',
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
  paddingHorizontal: 6,
  borderRadius: 8,
},

optionRowSelected: {
  backgroundColor: '#EEF6FF'
},

optionText: {
  marginLeft: 12,
  fontSize: 16,
  color: '#222'
},

optionTextSelected: {
  color: '#1D4ED8',
  fontWeight: '700'
},

modalFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 12,
  
},

clearButton: {
  paddingVertical: 10,
  paddingHorizontal: 14,
},

clearText: {
  color: '#666'
},

confirmButton: {
  backgroundColor: '#1D4ED8',
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 8,
},

confirmText: {
  color: '#fff',
  fontWeight: '600'
},

//

inputRegion: {
  height: 40,
  width:'100%',
  borderColor: 'white',
  borderBottomWidth: 2,
  marginBottom: 15,
  paddingHorizontal: 10,
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
},

dropdown: {
  width: '95%',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  maxHeight: 180,
  zIndex: 10,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},
dropdownItem: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#adadadff',
},

dropdownItemText: {
  fontSize: 14,
  color: '#333',
},



})
