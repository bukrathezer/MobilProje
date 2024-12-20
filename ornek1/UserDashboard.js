import React, { useState } from 'react';
import { View, Text, Button, FlatList, Modal, TextInput, StyleSheet } from 'react-native';

export default function UserDashboard() {
  // Kullanıcı bilgileri (mock veri)
  const [user, setUser] = useState({
    id: '1',
    name: 'Ali Yılmaz',
    bloodType: 'A+',
    height: 180, // cm
    weight: 75, // kg
    age: 30,
  });

  // Tahliller (mock veri)
  const [tests, setTests] = useState([
    { id: '1', date: '2024-01-01', result: 'Normal' },
    { id: '2', date: '2024-02-15', result: 'Yüksek' },
  ]);

  // Modal kontrolü
  const [isModalVisible, setModalVisible] = useState(false);

  // Kullanıcı bilgilerini güncellemek için kontrol
  const [editingField, setEditingField] = useState('');
  const [tempValue, setTempValue] = useState('');

  const handleUpdate = () => {
    setUser({ ...user, [editingField]: parseInt(tempValue, 10) });
    setEditingField('');
    setTempValue('');
  };

  return (
    <View style={styles.container}>
      {/* Kullanıcı Bilgileri */}
      <Text style={styles.title}>Kullanıcı Bilgileri</Text>
      <Text>İsim Soyisim: {user.name}</Text>
      <Text>Kan Grubu: {user.bloodType}</Text>
      <Text>Boy: {user.height} cm</Text>
      <Text>Kilo: {user.weight} kg</Text>
      <Text>Yaş: {user.age}</Text>

      {/* Güncelleme Butonları */}
      <View style={styles.buttonGroup}>
        <Button title="Boy Güncelle" onPress={() => setEditingField('height')} />
        <Button title="Kilo Güncelle" onPress={() => setEditingField('weight')} />
        <Button title="Yaş Güncelle" onPress={() => setEditingField('age')} />
      </View>

      {/* Tahlillerim Butonu */}
      <Button
        title="Tahlillerim"
        onPress={() => setModalVisible(true)}
        color="#6200EE"
      />

      {/* Modal: Tahliller */}
      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Geçmiş Tahliller</Text>
          <FlatList
            data={tests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.testItem}>
                <Text>Tarih: {item.date}</Text>
                <Text>Sonuç: {item.result}</Text>
              </View>
            )}
          />
          <Button title="Kapat" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>

      {/* Modal: Güncelleme */}
      {editingField !== '' && (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={styles.updateModal}>
            <Text style={styles.modalTitle}>Güncelle: {editingField}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={tempValue}
              onChangeText={(text) => setTempValue(text)}
              placeholder="Yeni değer girin"
            />
            <Button title="Güncelle" onPress={handleUpdate} />
            <Button title="İptal" onPress={() => setEditingField('')} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonGroup: {
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  testItem: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#e6e6e6',
    borderRadius: 8,
  },
  updateModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  input: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
});
