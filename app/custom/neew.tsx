import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Pressable,
  StyleSheet
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { getAuth } from 'firebase/auth'
import { Video, ResizeMode, Audio } from 'expo-av'
import { TextInput } from 'react-native-gesture-handler'
import * as DocumentPicker from 'expo-document-picker'
import { uploadPhoto } from '../../src/services/uploadPhoto'
import { uploadVideo } from '../../src/services/uploadVideo'
import { uploadAudio } from '../../src/services/uploadAudio'
import { globalStyles } from '../../mystyles/global'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Uploading() {
  const [loading, setLoading] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [audioName, setAudioName] = useState<string | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)

  const auth = getAuth()
  const userId = auth.currentUser?.uid
  

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    })

    if (!result.canceled) setPhotoUri(result.assets[0].uri)
  }

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos
    })

    if (!result.canceled) setVideoUri(result.assets[0].uri)
  }

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*'
    })

    if (!result.canceled) {
      setAudioUri(result.assets[0].uri)
      setAudioName(result.assets[0].name)
    }
  }

  const toggleAudio = async () => {
    if (!audioUri) return

    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
      setSound(null)
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      )
      setSound(newSound)
    }
  }

  const handleSave = async () => {
    if (!userId || loading) return

    try {
      setLoading(true)

      if (photoUri) await uploadPhoto(photoUri, userId)
      if (videoUri) await uploadVideo(videoUri, userId)
      if (audioUri) await uploadAudio(audioUri, userId)

      await AsyncStorage.setItem(`hasProfile:${userId}`, 'true')
      router.replace('/(tabs)/home')
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar sua apresentação')
    } finally {
      setLoading(false)
    }
  }

  const RemoveButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
      }}
    >
      <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
    </TouchableOpacity>
  )

  return (
    <View style={globalStyles.base}>
      <LinearGradient colors={['#8b83e4', '#763779']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
          <Text style={globalStyles.texth1}>Apresentação sobre você</Text>

          <Pressable style={styles.box} onPress={pickPhoto}>
            {photoUri ? (
              <>
                <RemoveButton onPress={() => setPhotoUri(null)} />
                <Image source={{ uri: photoUri }} style={styles.media} />
              </>
            ) : (
              <Text style={styles.text}>Adicionar foto</Text>
            )}
          </Pressable>

          <Pressable style={styles.box} onPress={pickVideo}>
            {videoUri ? (
              <>
                <RemoveButton onPress={() => setVideoUri(null)} />
                <Video
                  source={{ uri: videoUri }}
                  style={styles.media}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                />
              </>
            ) : (
              <Text style={styles.text}>Adicionar vídeo</Text>
            )}
          </Pressable>

          <Pressable style={styles.audioBox} onPress={pickAudio}>
            {audioUri ? (
              <>
                <RemoveButton onPress={() => setAudioUri(null)} />
                <TouchableOpacity onPress={toggleAudio}>
                  <Text style={styles.text}>{sound ? '⏸️' : '▶️'} {audioName}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.text}>Adicionar áudio</Text>
            )}
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder="Descrição"
            placeholderTextColor="#fff"
            multiline
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={globalStyles.btnLogin}
          >
            <Text style={globalStyles.btnLoginText}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: 350,
    height: 220,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    overflow: 'hidden'
  },
  audioBox: {
    width: 350,
    height: 80,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  media: {
    width: '100%',
    height: '100%'
  },
  text: {
    color: '#fff'
  },
  input: {
    width: 350,
    height: 120,
    borderWidth: 2,
    borderColor: '#fff',
    marginTop: 20,
    padding: 10,
    color: '#fff'
  }
})
