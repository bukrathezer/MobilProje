import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, TextInput, Modal, TouchableOpacity } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { NavigationProp } from '@react-navigation/native';

interface Tests {
    IgA: number | null;
    IgM: number | null;
    IgG: number | null;
    IgG1: number | null;
    IgG2: number | null;
    IgG3: number | null;
    IgG4: number | null;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    age: number | null;
    tests: Tests;
}

interface AdminDashboardProps {
    navigation: NavigationProp<any, any>;
}

const AdminDashboard = ({ navigation }: AdminDashboardProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(FIRESTORE_DB, 'users'), where('role', '==', 'user'));
                const usersSnapshot = await getDocs(q);
                const usersList: User[] = usersSnapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        role: data.role,
                        age: data.age || null,
                        tests: data.tests || {
                            IgA: null,
                            IgM: null,
                            IgG: null,
                            IgG1: null,
                            IgG2: null,
                            IgG3: null,
                            IgG4: null,
                        },
                    };
                });
                setUsers(usersList);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            Alert.alert('Success', 'You have successfully logged out.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            await updateDoc(doc(FIRESTORE_DB, 'users', editingUser.id), { tests: editingUser.tests });
            Alert.alert('Success', 'Test values updated successfully.');
            setModalVisible(false);
        } catch (error) {
            console.error('Error updating tests:', error);
            Alert.alert('Error', 'Failed to update test values. Please try again.');
        }
    };

    const handleTestChange = (key: keyof Tests, value: string) => {
        if (!editingUser) return;

        const updatedTests = {
            ...editingUser.tests,
            [key]: value ? parseFloat(value) : null,
        };

        setEditingUser({ ...editingUser, tests: updatedTests });
    };

    return (
        <View style={styles.container}>
            <Button title="Logout" onPress={handleLogout} color="#d9534f" />
            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userCard}>
                        <Text style={styles.userInfo}>
                            <Text style={styles.label}>Name:</Text> {item.firstName} {item.lastName}
                        </Text>
                        <Text style={styles.userInfo}>
                            <Text style={styles.label}>Email:</Text> {item.email}
                        </Text>
                        <Text style={styles.userInfo}>
                            <Text style={styles.label}>Age:</Text> {item.age ?? 'N/A'}
                        </Text>
                        <Button title="Edit Tests" onPress={() => handleEdit(item)} />
                    </View>
                )}
            />
            {editingUser && (
                <Modal visible={modalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Edit Test Values</Text>
                            {Object.keys(editingUser.tests).map((key) => (
                                <View key={key} style={styles.inputContainer}>
                                    <Text>{key}</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editingUser.tests[key as keyof Tests]?.toString() || ''}
                                        onChangeText={(value) => handleTestChange(key as keyof Tests, value)}
                                    />
                                </View>
                            ))}
                            <View style={styles.buttonRow}>
                                <Button title="Save" onPress={handleSave} />
                                <Button
                                    title="Cancel"
                                    onPress={() => setModalVisible(false)}
                                    color="#d9534f"
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#ffffff',
    },
    userCard: {
        padding: 15,
        marginVertical: 8,
        backgroundColor: '#f1f1f1',
        borderRadius: 8,
    },
    userInfo: {
        fontSize: 16,
        marginBottom: 5,
    },
    label: {
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    inputContainer: {
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 5,
        borderRadius: 5,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
});

export default AdminDashboard;
