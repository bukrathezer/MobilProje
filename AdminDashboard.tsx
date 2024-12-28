import React, { useEffect, useState } from 'react'; 
import { View, Text, FlatList, Button, StyleSheet, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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
    timestamp: any;
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
}

interface AdminDashboardProps {
    navigation: NavigationProp<any, any>;
}

const AdminDashboard = ({ navigation }: AdminDashboardProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [modalVisible, setModalVisible] = useState(false); // Modal visibility for Add Test
    const [editModalVisible, setEditModalVisible] = useState(false); // Modal visibility for Edit Test
    const [guideModalVisible, setGuideModalVisible] = useState(false); // Modal visibility for Create Guide
    const [guidesModalVisible, setGuidesModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userTests, setUserTests] = useState<{ [userId: string]: Tests[] }>({});
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [guideData, setGuideData] = useState<Guide | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Filtrelenmiş kullanıcılar
    const [searchText, setSearchText] = useState<string>(''); // Arama metni
    

    const [newTest, setNewTest] = useState<Tests>({
        IgA: null,
        IgM: null,
        IgG: null,
        IgG1: null,
        IgG2: null,
        IgG3: null,
        IgG4: null,
        timestamp: new Date(),
    });
    const [newGuide, setNewGuide] = useState<string>(''); // State for new guide

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
                    };
                });
                setUsers(usersList);
                setFilteredUsers(usersList); // Başlangıçta tüm kullanıcıları göster
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);


    const handleSearch = (text: string) => {
        setSearchText(text);
        if (text.trim() === '') {
            setFilteredUsers(users); // Arama metni boşsa tüm kullanıcıları göster
        } else {
            const lowercasedText = text.toLowerCase();
            const filtered = users.filter(
                (user) =>
                    user.firstName.toLowerCase().includes(lowercasedText) ||
                    user.lastName.toLowerCase().includes(lowercasedText)
            );
            setFilteredUsers(filtered);
        }
    };



    const createGuide = async () => {
        if (!newGuide.trim()) {
            Alert.alert('Error', 'Guide content cannot be empty.');
            return;
        }

        try {
            const guideCollectionRef = collection(FIRESTORE_DB, 'guides');
            await addDoc(guideCollectionRef, { content: newGuide, timestamp: new Date() });
            Alert.alert('Success', 'Guide created successfully.');
            setGuideModalVisible(false); // Close modal after saving
            setNewGuide(''); // Clear the input
        } catch (error) {
            console.error('Error creating guide:', error);
            Alert.alert('Error', 'Failed to create guide. Please try again.');
        }
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

    const addTestForUser = (user: User) => {
        setEditingUser(user);
        setModalVisible(true); // Open modal for adding test
    };

    const handleTestSave = async () => {
        if (!editingUser) return;

        try {
            const userTestsCollectionRef = collection(FIRESTORE_DB, `users/${editingUser.id}/tests`);
            await addDoc(userTestsCollectionRef, {
                ...newTest,
                timestamp: new Date(),
            });
            Alert.alert('Success', 'Test entry created successfully.');
            setModalVisible(false); // Close modal after saving
        } catch (error) {
            console.error('Error adding test:', error);
            Alert.alert('Error', 'Failed to create test. Please try again.');
        }
    };

    const fetchTestsForUser = async (user: User) => {
        try {
            const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${user.id}/tests`));
            const testsList: Tests[] = testsSnapshot.docs.map((doc) => doc.data() as Tests);
            setUserTests((prevState) => ({
                ...prevState,
                [user.id]: testsList, // Set tests for the selected user
            }));
        } catch (error) {
            console.error('Error fetching tests:', error);
        }
    };

    const formatTimestamp = (timestamp?: { seconds: number; nanoseconds: number }): string => {
        if (!timestamp) return 'No Date';
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
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

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditModalVisible(true); // Open modal for editing tests
        fetchTestsForUser(user); // Fetch tests for the selected user
    };

    const handleLogout = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            Alert.alert('Success', 'Logged out successfully', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Logout failed.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerButtons}>
                <Button title="My Guides" onPress={fetchGuides} color="#5cb85c" />
                <Button title="Create Guide" onPress={() => setGuideModalVisible(true)} color="#5cb85c" />
                <TextInput
                style={styles.searchBar}
                placeholder="Search by Name or Surname"
                value={searchText}
                onChangeText={handleSearch}
            />
                <Button title="Logout" onPress={handleLogout} color="#d9534f" />
               
            </View>

            <FlatList
                data={filteredUsers}
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
                            <Button title="Add Test" onPress={() => addTestForUser(item)} color="#5cb85c" />
                        </View>
                    </View>
                )}
            />

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
                                        <ScrollView key={index} style={styles.inputContainer}>
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
                                        </ScrollView>
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



            {/* Add Test Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Test for {editingUser?.firstName} {editingUser?.lastName}</Text>
                        
                        {/* Add ScrollView to make the content scrollable */}
                        <ScrollView style={styles.scrollViewContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="IgA"
                                keyboardType="numeric"
                                value={newTest.IgA?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgA: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgM"
                                keyboardType="numeric"
                                value={newTest.IgM?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgM: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG"
                                keyboardType="numeric"
                                value={newTest.IgG?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgG: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG1"
                                keyboardType="numeric"
                                value={newTest.IgG1?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgG1: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG2"
                                keyboardType="numeric"
                                value={newTest.IgG2?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgG2: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG3"
                                keyboardType="numeric"
                                value={newTest.IgG3?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgG3: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG4"
                                keyboardType="numeric"
                                value={newTest.IgG4?.toString()}
                                onChangeText={(text) => setNewTest({ ...newTest, IgG4: Number(text) })}
                            />
                            {/* Add more inputs as needed for IgG1, IgG2, IgG3, IgG4 */}
                        </ScrollView>

                        <View style={styles.buttonRow}>
                            <Button title="Save Test" onPress={handleTestSave} color="#5cb85c" />
                            <Button title="Close" onPress={() => setModalVisible(false)} color="#d9534f" />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Test Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Tests for {editingUser?.firstName} {editingUser?.lastName}</Text>
                        
                                                    <ScrollView style={styles.scrollViewContainer}>
                                {editingUser?.id &&
                                    userTests[editingUser.id]
                                        ?.slice() // Orijinal veriyi değiştirmemek için kopya oluştur.
                                        .sort((a, b) => {
                                            const timeA = a.timestamp?.seconds ?? 0; // Geçerli bir timestamp yoksa 0
                                            const timeB = b.timestamp?.seconds ?? 0;
                                            return timeA - timeB; // Küçükten büyüğe sıralama
                                        })
                                        .map((test: Tests, index: number) => (
                                            <View key={index} style={styles.tableContainer}>
                                                <Text style={styles.timestamp}>Timestamp: {formatTimestamp(test.timestamp)}</Text>
                                                <View style={styles.tableHeader}>
                                                    <Text style={styles.tableCell}>Test Type</Text>
                                                    <Text style={styles.tableCell}>Value</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgA</Text>
                                                    <Text style={styles.tableCell}>{test.IgA ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgM</Text>
                                                    <Text style={styles.tableCell}>{test.IgM ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgG</Text>
                                                    <Text style={styles.tableCell}>{test.IgG ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgG1</Text>
                                                    <Text style={styles.tableCell}>{test.IgG1 ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgG2</Text>
                                                    <Text style={styles.tableCell}>{test.IgG2 ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgG3</Text>
                                                    <Text style={styles.tableCell}>{test.IgG3 ?? 'N/A'}</Text>
                                                </View>
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>IgG4</Text>
                                                    <Text style={styles.tableCell}>{test.IgG4 ?? 'N/A'}</Text>
                                                </View>
                                            </View>
                                        ))}
                            </ScrollView>





                        <View style={styles.buttonRow}>
                            <Button title="Close" onPress={() => setEditModalVisible(false)} color="#d9534f" />
                        </View>
                    </View>
                </View>
            </Modal>
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
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    scrollViewContainer: {
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    tableContainer: {
        marginBottom: 15,
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
    addTestButton: {
        marginTop: 10,
    },
    inputContainer: {
        marginBottom: 10,
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
    searchBar: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    timestamp: { marginBottom: 8, fontWeight: 'bold' },
});

export default AdminDashboard;
