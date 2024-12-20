import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Modal } from 'react-native';

const mockPatients = [
  {
    id: '1',
    name: 'Ali Yılmaz',
    tc: '12345678901',
    gender: 'Erkek',
    birthPlace: 'Ankara',
    patientNumber: '101',
    tests: {
      IgA: 30,
      IgM: 140,
      IgG: 900,
      IgG1: 200,
      IgG2: 150,
      IgG3: 100,
      IgG4: 80,
    },
  },
  {
    id: '2',
    name: 'Ayşe Kaya',
    tc: '98765432109',
    gender: 'Kadın',
    birthPlace: 'İstanbul',
    patientNumber: '102',
    tests: {
      IgA: 50,
      IgM: 90,
      IgG: 700,
      IgG1: 300,
      IgG2: 250,
      IgG3: 50,
      IgG4: 120,
    },
  },
];

const referenceRanges = {
  IgA: { min: 60, max: 100 },
  IgM: { min: 80, max: 140 },
  IgG: { min: 700, max: 1600 },
  IgG1: { min: 100, max: 300 },
  IgG2: { min: 70, max: 200 },
  IgG3: { min: 30, max: 110 },
  IgG4: { min: 40, max: 90 },
};

export default function AdminDashboard() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setModalVisible(true);
  };

  const getStatus = (value, range) => {
    if (value < range.min) return 'D'; // Altında
    if (value > range.max) return 'U'; // Üstünde
    return 'O'; // Referans aralığında
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      <FlatList
        data={mockPatients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>Ad Soyad: {item.name}</Text>
            <Text>TC: {item.tc}</Text>
            <Text>Cinsiyet: {item.gender}</Text>
            <Text>Doğum Yeri: {item.birthPlace}</Text>
            <Text>Hasta Numarası: {item.patientNumber}</Text>
            <Button title="Detayları Gör" onPress={() => handlePatientSelect(item)} />
          </View>
        )}
      />

      {/* Hasta Takibi Modal */}
      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          {selectedPatient && (
            <>
              {/* Hasta Bilgileri */}
              <Text style={styles.modalTitle}>Hasta Bilgileri</Text>
              <Text>Ad Soyad: {selectedPatient.name}</Text>
              <Text>TC: {selectedPatient.tc}</Text>
              <Text>Cinsiyet: {selectedPatient.gender}</Text>
              <Text>Doğum Yeri: {selectedPatient.birthPlace}</Text>
              <Text>Hasta Numarası: {selectedPatient.patientNumber}</Text>

              {/* Tahlil Tablosu */}
              <Text style={styles.modalSubtitle}>Tahlil Değerleri</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>Tahlil</Text>
                <Text style={styles.tableCell}>Değer</Text>
                <Text style={styles.tableCell}>Durum</Text>
                <Text style={styles.tableCell}>Referans</Text>
              </View>
              {Object.keys(selectedPatient.tests).map((testKey) => (
                <View key={testKey} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{testKey}</Text>
                  <Text style={styles.tableCell}>{selectedPatient.tests[testKey]}</Text>
                  <Text style={styles.tableCell}>
                    {getStatus(selectedPatient.tests[testKey], referenceRanges[testKey])}
                  </Text>
                  <Text style={styles.tableCell}>
                    {referenceRanges[testKey].min}-{referenceRanges[testKey].max}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Button title="Kapat" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
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
  listItem: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  modalSubtitle: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
});
