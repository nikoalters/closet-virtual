import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList, StatusBar, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase';
import { decode } from 'base64-arraybuffer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const columnWidth = (width - 60) / 2;

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState('upload');
  const [closetItems, setClosetItems] = useState([]);
  const [fetchingCloset, setFetchingCloset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session && activeTab === 'closet') {
      fetchCloset();
    }
  }, [session, activeTab]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    const cleanedEmail = email.trim().toLowerCase();

    if (isSignUp) {
      if (!username) {
        Alert.alert("Error", "Por favor ingresa un nombre de usuario");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          data: { username }
        }
      });
      if (error) Alert.alert("Error de registro", error.message);
      else Alert.alert("Éxito", "Cuenta creada. Por favor inicia sesión.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password
      });
      if (error) Alert.alert("Error de inicio de sesión", error.message);
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
    setImage(null);
    setProcessedImage(null);
    setClosetItems([]);
    setActiveTab('upload');
  };

  const fetchCloset = async () => {
    setFetchingCloset(true);
    try {
      const { data, error } = await supabase
        .from('clothes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClosetItems(data);
    } catch (error) {
      Alert.alert("Error al cargar el clóset", error.message);
    } finally {
      setFetchingCloset(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setProcessedImage(null);
    }
  };

  const processWithAI = async () => {
    if (!image) {
      Alert.alert("Error", "Por favor selecciona una imagen primero");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: image,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await fetch('https://zsaxx-186-11-49-189.run.pinggy-free.link/remove-background', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) throw new Error("Error en el servidor de IA");

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setProcessedImage(reader.result);
        setLoading(false);
      };
      reader.readAsDataURL(blob);

    } catch (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
    }
  };

  const saveToCloset = async () => {
    if (!processedImage || !session) return;

    setUploading(true);
    try {
      const fileName = `${session.user.id}/garment_${Date.now()}.jpg`;
      const base64Data = processedImage.split(',')[1];

      const { data: storageData, error: storageError } = await supabase.storage
        .from('clothes')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/jpeg',
        });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('clothes')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('clothes')
        .insert([{ image_url: publicUrl, user_id: session.user.id }]);

      if (dbError) throw dbError;

      Alert.alert("Éxito 🎉", "Prenda guardada en tu clóset privado");
      setImage(null);
      setProcessedImage(null);
      setActiveTab('closet');

    } catch (error) {
      Alert.alert("Error al guardar", error.message);
    } finally {
      setUploading(false);
    }
  };

  const renderClosetItem = ({ item }) => (
    <View style={styles.gridItem}>
      <View style={styles.garmentCard}>
        <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="contain" />
      </View>
    </View>
  );

  if (!session) {
    return (
      <View style={styles.containerLogin}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.titleLogin}>PocketCloset AI</Text>
          <Text style={styles.subtitleLogin}>Tu armario digital inteligente</Text>

          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Alias único (Valentina)"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#00ffcc" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.buttonAuth} onPress={handleAuth}>
              <Text style={styles.buttonText}>{isSignUp ? "Crear Mi Clóset" : "Entrar a Mi Clóset"}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.toggleText}>
              {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nueva? Regístrate aquí"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingHeader}>Hola,</Text>
          <Text style={styles.title}>{activeTab === 'upload' ? 'Nueva Prenda' : activeTab === 'closet' ? 'Mi Armario' : 'Probador'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ff007f" />
          <Text style={styles.signOutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'upload' && (
          <View style={styles.uploadSection}>
            <View style={styles.previewContainer}>
              <View style={[styles.imageCard, !image && styles.imagePlaceholder]}>
                {image ? <Image source={{ uri: image }} style={styles.image} /> : <Ionicons name="image-outline" size={40} color="#333" />}
              </View>
              <View style={[styles.imageCard, styles.imageCardProcessed, !processedImage && styles.imagePlaceholder]}>
                {processedImage ? <Image source={{ uri: processedImage }} style={styles.imageProcessed} /> : <MaterialCommunityIcons name="robot-outline" size={40} color="#333" />}
              </View>
            </View>

            {loading && <ActivityIndicator size="large" color="#00ffcc" style={styles.loader} />}
            {uploading && <ActivityIndicator size="large" color="#ff007f" style={styles.loader} />}

            <TouchableOpacity style={styles.buttonAction} onPress={pickImage}>
              <Ionicons name="camera-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonTextAction}>Tomar/Seleccionar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonAction, styles.aiButton]} onPress={processWithAI}>
              <MaterialCommunityIcons name="magic-staff" size={20} color="#000" style={styles.buttonIcon} />
              <Text style={styles.buttonTextAction}>Limpiar con IA</Text>
            </TouchableOpacity>

            {processedImage && !uploading && (
              <TouchableOpacity style={[styles.buttonAction, styles.saveButton]} onPress={saveToCloset}>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonTextAction}>Guardar en Clóset</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {activeTab === 'closet' && (
          <View style={styles.closetSection}>
            {fetchingCloset ? (
              <ActivityIndicator size="large" color="#00ffcc" />
            ) : closetItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shirt-outline" size={80} color="#222" />
                <Text style={styles.emptyText}>Tu clóset está totalmente vacío.</Text>
                <Text style={styles.emptySubtitle}>Agrega tu primera prenda desde la pestaña 'Subir'.</Text>
              </View>
            ) : (
              <FlatList
                data={closetItems}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={renderClosetItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.closetGrid}
              />
            )}
          </View>
        )}
        {activeTab === 'tryon' && (
          <View style={styles.emptyContainer}>
            <Ionicons name="woman-outline" size={80} color="#222" />
            <Text style={styles.emptyText}>Probador Virtual (VTO)</Text>
            <Text style={styles.emptySubtitle}>¡Muy pronto podrás subir tu foto y probarte los outfits!</Text>
            <Text style={styles.emptySubtitle}>Estamos integrando el motor de IA.</Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('upload')}>
          <Ionicons name={activeTab === 'upload' ? "add-circle" : "add-circle-outline"} size={26} color={activeTab === 'upload' ? "#00ffcc" : "#666"} />
          <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>Subir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('closet')}>
          <Ionicons name={activeTab === 'closet' ? "albums" : "albums-outline"} size={26} color={activeTab === 'closet' ? "#00ffcc" : "#666"} />
          <Text style={[styles.tabText, activeTab === 'closet' && styles.activeTabText]}>Mi Ropa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('tryon')}>
          <Ionicons name={activeTab === 'tryon' ? "woman" : "woman-outline"} size={26} color={activeTab === 'tryon' ? "#ff007f" : "#666"} />
          <Text style={[styles.tabText, activeTab === 'tryon' && styles.activeTabTryonText]}>Probador</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: StatusBar.currentHeight || 50,
  },
  containerLogin: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    width: '90%',
    backgroundColor: '#111',
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    elevation: 10,
    shadowColor: '#00ffcc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  titleLogin: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ffcc',
    marginBottom: 5,
  },
  subtitleLogin: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 30,
    height: 60,
  },
  greetingHeader: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  uploadSection: {
    alignItems: 'center',
    width: '100%',
  },
  closetSection: {
    flex: 1,
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 25,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: width * 0.45,
    marginBottom: 40,
  },
  imageCard: {
    width: '48%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderStyle: 'dashed',
    borderColor: '#333',
  },
  imageCardProcessed: {
    borderColor: '#00ffcc',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageProcessed: {
    width: '100%',
    height: '100%',
  },
  loader: {
    marginVertical: 20,
  },
  buttonAuth: {
    backgroundColor: '#00ffcc',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonAction: {
    backgroundColor: '#111',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonIcon: {
    marginRight: 10,
  },
  aiButton: {
    backgroundColor: '#00ffcc',
    borderColor: '#00ffcc',
  },
  saveButton: {
    backgroundColor: '#ff007f',
    borderColor: '#ff007f',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextAction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
    marginTop: 20,
    alignSelf: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  signOutText: {
    color: '#ff007f',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closetGrid: {
    paddingHorizontal: 5,
    paddingTop: 10,
  },
  gridItem: {
    flex: 1,
    margin: 10,
    width: columnWidth,
  },
  garmentCard: {
    height: 180,
    backgroundColor: '#111',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#161616',
    backgroundColor: '#0a0a0a',
    paddingBottom: StatusBar.currentHeight === 0 ? 30 : 20,
    paddingTop: 15,
    height: StatusBar.currentHeight === 0 ? 95 : 85,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 5,
  },
  activeTabText: {
    color: '#00ffcc',
  },
  activeTabTryonText: {
    color: '#ff007f',
  },
});