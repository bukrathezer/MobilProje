import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [role, setRole] = useState('');

  const handleLogin = () => {
    if (role === 'admin') {
      navigation.navigate('AdminDashboard');
    } else if (role === 'user') {
      navigation.navigate('UserDashboard');
    } else {
      alert('Lütfen "admin" veya "user" rolü girin.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-Laboratuvar Sistemi</Text>
      <TextInput
        style={styles.input}
        placeholder="Rolünüz (admin/user)"
        value={role}
        onChangeText={setRole}
      />
      <Button title="Giriş Yap" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, padding: 8, marginBottom: 16 },
});
