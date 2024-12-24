import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface ViewTestsProps {
    userId: string;
    firstName: string;
    lastName: string;
}

const ViewTests = ({ userId, firstName, lastName }: ViewTestsProps) => {
    const [tests, setTests] = useState<Record<string, number | null>>({});
    const [loading, setLoading] = useState(true);

    const handleSignOut = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            alert('Çıkış yapıldı.');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    useEffect(() => {
        const fetchUserTests = async () => {
            try {
                const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
                if (userDoc.exists()) {
                    setTests(userDoc.data().tests || {});
                }
            } catch (error) {
                console.error('Error fetching user tests:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserTests();
    }, [userId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    Hoşgeldiniz {firstName} {lastName}
                </Text>
                <Button title="Log Out" onPress={handleSignOut} color="red" />
            </View>

            {/* Tahliller Tablosu */}
            <FlatList
                data={Object.entries(tests)}
                keyExtractor={([key]) => key}
                renderItem={({ item }) => (
                    <View style={styles.testRow}>
                        <Text style={styles.testKey}>{item[0]}</Text>
                        <Text style={styles.testValue}>{item[1] !== null ? item[1].toString() : 'N/A'}</Text>
                    </View>
                )}
                ListHeaderComponent={() => (
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderText}>Tahlil Adı</Text>
                        <Text style={styles.tableHeaderText}>Değer</Text>
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#e9ecef',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 5,
    },
    tableHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    testRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginVertical: 5,
    },
    testKey: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    testValue: {
        fontSize: 16,
        color: '#666',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ViewTests;