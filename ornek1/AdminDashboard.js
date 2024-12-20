import React from 'react';
import { View, Text, Button, TextInput, FlatList } from 'react-native';

const mockPatients = [
  { id: '1', name: 'Ali Yılmaz', date: '2024-01-01', result: 'Normal' },
  { id: '2', name: 'Ayşe Kaya', date: '2024-02-15', result: 'Yüksek' },
];

export default function AdminDashboard() {
  const [search, setSearch] = React.useState('');

  const filteredPatients = mockPatients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Hasta Takibi</Text>
      <TextInput
        placeholder="Hasta Adı"
        style={{
          borderWidth: 1,
          padding: 8,
          marginBottom: 16,
        }}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 8 }}>
            <Text>Ad: {item.name}</Text>
            <Text>Tarih: {item.date}</Text>
            <Text>Sonuç: {item.result}</Text>
          </View>
        )}
      />
      <Button title="Kılavuz Oluştur" onPress={() => alert('Kılavuz ekranı')} />
    </View>
  );
}
