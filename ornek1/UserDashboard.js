import React from 'react';
import { View, Text, Button, FlatList } from 'react-native';

const mockTests = [
  { id: '1', date: '2024-01-01', result: 'Normal' },
  { id: '2', date: '2024-02-15', result: 'Yüksek' },
];

export default function UserDashboard({ navigation }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Geçmiş Tahliller</Text>
      <FlatList
        data={mockTests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 8 }}>
            <Text>Tarih: {item.date}</Text>
            <Text>Sonuç: {item.result}</Text>
          </View>
        )}
      />
      <Button title="Profil Yönetimi" onPress={() => alert('Profil ekranı')} />
    </View>
  );
}
