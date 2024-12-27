import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, TextInput, Modal, TouchableOpacity } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
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

interface Guide {
    testType: string;
    ranges: { ageGroup: string; min: number | null; max: number | null }[];
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
    const [guideModalVisible, setGuideModalVisible] = useState(false);
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [guideData, setGuideData] = useState<Guide | null>(null);

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

    const handleCreateGuide = () => {
        setGuideModalVisible(true);
    };

    const handleSelectTest = (test: string) => {
        setSelectedTest(test);
        setGuideData({
            testType: test,
            ranges: [
                { ageGroup: '25-36 months', min: null, max: null },
                { ageGroup: '3-5 years', min: null, max: null },
                { ageGroup: '6-8 years', min: null, max: null },
                { ageGroup: '9-11 years', min: null, max: null },
                { ageGroup: '12-16 years', min: null, max: null },
                { ageGroup: '16-18 years', min: null, max: null },
                { ageGroup: 'Total', min: null, max: null },
            ],
        });
    };

    const handleGuideChange = (index: number, key: 'min' | 'max', value: string) => {
        if (!guideData) return;

        const updatedRanges = [...guideData.ranges];
        updatedRanges[index][key] = value ? parseFloat(value) : null;

        setGuideData({ ...guideData, ranges: updatedRanges });
    };

    const saveGuideToDatabase = async () => {
        if (!guideData) return;

        try {
            await addDoc(collection(FIRESTORE_DB, 'guides'), guideData);
            Alert.alert('Success', 'Guide saved successfully.');
            setGuideModalVisible(false);
        } catch (error) {
            console.error('Error saving guide:', error);
            Alert.alert('Error', 'Failed to save guide. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerButtons}>
                <Button title="Logout" onPress={handleLogout} color="#d9534f" />
                <Button title="Create a Guide" onPress={handleCreateGuide} color="#5bc0de" />
            </View>

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

            {guideModalVisible && (
                <Modal visible={guideModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            {!selectedTest ? (
                                <>
                                    <Text style={styles.modalTitle}>Select Test</Text>
                                    {['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'].map((test) => (
                                        <Button key={test} title={test} onPress={() => handleSelectTest(test)} />
                                    ))}
                                </>
                            ) : (
                                <>
                                    <Text style={styles.modalTitle}>Guide for {selectedTest}</Text>
                                    {guideData?.ranges.map((range, index) => (
                                        <View key={index} style={styles.inputContainer}>
                                            <Text>{range.ageGroup}</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Min"
                                                keyboardType="numeric"
                                                value={range.min?.toString() || ''}
                                                onChangeText={(value) => handleGuideChange(index, 'min', value)}
                                            />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Max"
                                                keyboardType="numeric"
                                                value={range.max?.toString() || ''}
                                                onChangeText={(value) => handleGuideChange(index, 'max', value)}
                                            />
                                        </View>
                                    ))}
                                    <View style={styles.buttonRow}>
                                        <Button title="Save Guide" onPress={saveGuideToDatabase} />
                                        <Button
                                            title="Cancel"
                                            onPress={() => setGuideModalVisible(false)}
                                            color="#d9534f"
                                        />
                                    </View>
                                </>
                            )}
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
    headerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
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
        marginBottom: 5,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
});

export default AdminDashboard;
