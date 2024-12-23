import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { NavigationProp } from '@react-navigation/native';

interface Guide {
    id: string;
    testName: string;
    value: string;
    ageRange: string;
}

interface AdminDashboardProps {
    navigation: NavigationProp<any, any>;
}

const AdminDashboard = ({ navigation }: AdminDashboardProps) => {
    const [guides, setGuides] = useState<Guide[]>([]);

    useEffect(() => {
        const fetchGuides = async () => {
            const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, 'guides'));
            const guidesList: Guide[] = guidesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Guide[];
            setGuides(guidesList);
        };

        fetchGuides();
    }, []);

    return (
        <View style={styles.container}>
            <Button
                title="Create Guide"
                onPress={() => navigation.navigate('CreateGuide')}
            />
            <FlatList
                data={guides}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.guideCard}>
                        <Text>{item.testName}</Text>
                        <Text>{item.value}</Text>
                        <Text>{item.ageRange}</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    guideCard: {
        padding: 10,
        marginVertical: 5,
        backgroundColor: '#f8f9fa',
        borderRadius: 5,
    },
});

export default AdminDashboard;
