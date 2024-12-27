import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, TextInput, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { NavigationProp } from '@react-navigation/native';
import { ToastAndroid } from 'react-native'; // For displaying the guide created message

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
    const [guides, setGuides] = useState<Guide[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [guideModalVisible, setGuideModalVisible] = useState(false);
    const [guidesModalVisible, setGuidesModalVisible] = useState(false);
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


    const addTestForUser = async (user: User) => {
        try {
            const userTestsCollectionRef = collection(FIRESTORE_DB, `users/${user.id}/tests`);

            await addDoc(userTestsCollectionRef, {
                IgA: null,
                IgM: null,
                IgG: null,
                IgG1: null,
                IgG2: null,
                IgG3: null,
                IgG4: null,
                timestamp: new Date(),
            });

            Alert.alert('Success', 'New test entry created successfully.');
        } catch (error) {
            console.error('Error adding new test:', error);
            Alert.alert('Error', 'Failed to create new test. Please try again.');
        }
    };





    const fetchGuides = async () => {
        try {
            const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, 'guides'));
            const guidesList: Guide[] = guidesSnapshot.docs.map((doc) => doc.data() as Guide);
            setGuides(guidesList);
            setGuidesModalVisible(true);
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Failed to fetch guides. Please try again.');
        }
    };

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
        setSelectedTest(null); // Reset test selection when opening the guide creation modal
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
            ToastAndroid.show('Guide created', ToastAndroid.SHORT); // Display guide created message
            setGuideModalVisible(false); // Close the guide creation modal
            setSelectedTest(null); // Reset selected test after saving
        } catch (error) {
            console.error('Error saving guide:', error);
            Alert.alert('Error', 'Failed to save guide. Please try again.');
        }
    };

    const handleCloseGuideModal = () => {
        setGuideModalVisible(false);
        setSelectedTest(null); // Reset selected test when closing
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerButtons}>
                <Button title="Logout" onPress={handleLogout} color="#d9534f" />
                <Button title="Create a Guide" onPress={handleCreateGuide} color="#5bc0de" />
                <Button title="My Guides" onPress={fetchGuides} color="#5cb85c" />
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
                        <View style={styles.addTestButton}>
                            <Button
                                title="Add Test"
                                onPress={() => addTestForUser(item)} // Add test for the user
                                color="#5cb85c"
                            />
                        </View>
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
                                    <Button
                                        title="Close"
                                        onPress={handleCloseGuideModal}
                                        color="#d9534f"
                                    />
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
                                            onPress={handleCloseGuideModal}
                                            color="#d9534f"
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            {guidesModalVisible && (
                <Modal visible={guidesModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Saved Guides</Text>
                            <ScrollView>
                                {guides.map((guide, index) => (
                                    <View key={index} style={styles.guideContainer}>
                                        <Text style={styles.guideTitle}>Test: {guide.testType}</Text>
                                        <View style={styles.tableHeader}>
                                            <Text style={styles.tableCell}>Age Group</Text>
                                            <Text style={styles.tableCell}>Min</Text>
                                            <Text style={styles.tableCell}>Max</Text>
                                        </View>
                                        {guide.ranges.map((range, rangeIndex) => (
                                            <View key={rangeIndex} style={styles.tableRow}>
                                                <Text style={styles.tableCell}>{range.ageGroup}</Text>
                                                <Text style={styles.tableCell}>{range.min ?? 'N/A'}</Text>
                                                <Text style={styles.tableCell}>{range.max ?? 'N/A'}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </ScrollView>
                            <Button
                                title="Close"
                                onPress={() => setGuidesModalVisible(false)}
                                color="#d9534f"
                            />
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
    guideContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
    },
    guideTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#e9e9e9',
        padding: 5,
        borderRadius: 5,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 5,
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
    },
    // Add all your styles here, including the new addTestButton style
        addTestButton: {
            marginTop: 10,
        },
    
});
export default AdminDashboard;
