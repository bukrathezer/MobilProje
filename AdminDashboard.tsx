// AdminDashboard.tsx

import React, { useEffect, useState, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    Button,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { NavigationProp } from '@react-navigation/native';
import { ToastAndroid } from 'react-native'; // For displaying the guide created message

interface Tests {
    id?: string; // Test ID
    IgA: number | null;
    IgM: number | null;
    IgG: number | null;
    IgG1: number | null;
    IgG2: number | null;
    IgG3: number | null;
    IgG4: number | null;
    timestamp: Timestamp | number;
}

interface Guide {
    testType: string;
    ranges: Range[];
}

interface Range {
    ageGroup: string;
    ageMin: number | null;
    ageMax: number | null;
    min: number | null;
    max: number | null;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    ageInMonths: number | null;
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
        timestamp: Timestamp.fromDate(new Date()), // Düzeltme burada
    });

    const [userInfo, setUserInfo] = useState<{
        email: string;
        ageInMonths: number | null;
        firstName: string;
        lastName: string;
    }>({
        email: '',
        ageInMonths: null,
        firstName: '',
        lastName: '',
    });

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
                        ageInMonths: data.ageInMonths || null,
                    };
                });
                setUsers(usersList);
                setFilteredUsers(usersList); // Başlangıçta tüm kullanıcıları göster
            } catch (error) {
                console.error('Error fetching users:', error);
                Alert.alert('Error', 'Failed to fetch users. Please try again.');
            }
        };

        const fetchUserInfo = async () => {
            try {
                // Adminin kendi bilgilerini çekmek için
                const adminDocRef = doc(FIRESTORE_DB, 'users', FIREBASE_AUTH.currentUser?.uid || '');
                const adminDoc = await getDoc(adminDocRef);
                if (adminDoc.exists()) {
                    const data = adminDoc.data();
                    setUserInfo({
                        email: data.email || '',
                        ageInMonths: data.ageInMonths || null,
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                    });
                }
            } catch (error) {
                console.error('Error fetching admin info:', error);
                Alert.alert('Error', 'Failed to fetch admin info.');
            }
        };

        fetchUsers();
        fetchUserInfo();
    }, []);

    useEffect(() => {
        // Guides'ı fetch et
        fetchGuides();
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

    const handleSelectTest = (test: string) => {
        setSelectedTest(test);
        setGuideData({
            testType: test,
            ranges: [],
        });
    };

    const handleGuideChange = (index: number, field: keyof Guide['ranges'][0], value: any) => {
        setGuideData((prev) => {
            if (!prev) return prev; // Null kontrolü

            const updatedRanges = [...prev.ranges];

            // Değeri güvenli bir şekilde atama
            updatedRanges[index] = {
                ...updatedRanges[index],
                [field]: value ? parseFloat(value) : null, // Eğer değeri yoksa null ata
            };

            return {
                ...prev,
                ranges: updatedRanges,
            };
        });
    };

    const handleAgeGroupChange = (index: number, value: string) => {
        if (!guideData) return;

        const updatedRanges = [...guideData.ranges];
        updatedRanges[index].ageGroup = value;

        setGuideData({ ...guideData, ranges: updatedRanges });
    };

    const addAgeGroup = () => {
        setGuideData((prev) => {
            if (!prev) return prev; // Eğer prev null ise, olduğu gibi geri dön

            return {
                ...prev,
                ranges: [
                    ...prev.ranges,
                    {
                        ageGroup: "",
                        ageMin: 0, // Burada null yerine 0 kullanılabilir
                        ageMax: 0,
                        min: 0,
                        max: 0
                    }, // Sayılarla başlatıyoruz
                ],
            };
        });
    };

    const saveGuideToDatabase = async () => {
        if (!guideData) return;

        try {
            await addDoc(collection(FIRESTORE_DB, 'guides'), guideData);
            ToastAndroid.show('Guide created', ToastAndroid.SHORT); // Guide oluşturuldu mesajını göster
            setGuideModalVisible(false); // Guide oluşturma modalını kapat
            setSelectedTest(null); // Kaydedildikten sonra seçilen testi sıfırla
        } catch (error) {
            console.error('Error saving guide:', error);
            Alert.alert('Error', 'Failed to save guide. Please try again.');
        }
    };

    const handleCloseGuideModal = () => {
        setGuideModalVisible(false);
        setSelectedTest(null); // Kapatırken seçilen testi sıfırla
        setGuideData(null);
    };

    const addTestForUser = (user: User) => {
        setEditingUser(user);
        setModalVisible(true); // Test eklemek için modalı aç
    };

    const handleTestSave = async () => {
        if (!editingUser) return;

        try {
            const userTestsCollectionRef = collection(FIRESTORE_DB, `users/${editingUser.id}/tests`);
            await addDoc(userTestsCollectionRef, {
                ...newTest,
                timestamp: Timestamp.fromDate(new Date()), // Timestamp'ı buraya atıyoruz
            });
            Alert.alert('Success', 'Test entry created successfully.');
            setModalVisible(false); // Modalı kapat
            setNewTest({
                IgA: null,
                IgM: null,
                IgG: null,
                IgG1: null,
                IgG2: null,
                IgG3: null,
                IgG4: null,
                timestamp: Timestamp.fromDate(new Date()), // Test formunu sıfırla
            }); 
            fetchTestsForUser(editingUser); // Testleri yenile
        } catch (error) {
            console.error('Error adding test:', error);
            Alert.alert('Error', 'Failed to create test. Please try again.');
        }
    };

    const fetchTestsForUser = async (user: User) => {
        try {
            const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${user.id}/tests`));
            const testsList: Tests[] = testsSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    IgA: typeof data.IgA === 'number' ? data.IgA : parseFloat(data.IgA) || null,
                    IgM: typeof data.IgM === 'number' ? data.IgM : parseFloat(data.IgM) || null,
                    IgG: typeof data.IgG === 'number' ? data.IgG : parseFloat(data.IgG) || null,
                    IgG1: typeof data.IgG1 === 'number' ? data.IgG1 : parseFloat(data.IgG1) || null,
                    IgG2: typeof data.IgG2 === 'number' ? data.IgG2 : parseFloat(data.IgG2) || null,
                    IgG3: typeof data.IgG3 === 'number' ? data.IgG3 : parseFloat(data.IgG3) || null,
                    IgG4: typeof data.IgG4 === 'number' ? data.IgG4 : parseFloat(data.IgG4) || null,
                    timestamp: data.timestamp instanceof Timestamp ? data.timestamp : Timestamp.fromDate(new Date(data.timestamp)),
                } as Tests;
            });
            setUserTests((prevState) => ({
                ...prevState,
                [user.id]: testsList, // Kullanıcı için testleri ayarla
            }));
        } catch (error) {
            console.error('Error fetching tests:', error);
            Alert.alert('Error', 'Failed to fetch tests for the user.');
        }
    };

    const formatTimestamp = (timestamp?: Timestamp | number): string => {
        if (!timestamp) return 'No Date';
        let date: Date;
        if (
            typeof timestamp === 'object' &&
            'seconds' in timestamp &&
            'nanoseconds' in timestamp &&
            typeof timestamp.toDate === 'function'
        ) {
            // Firestore Timestamp
            date = timestamp.toDate();
        } else if (typeof timestamp === 'number') {
            // Unix zaman damgası
            date = new Date(timestamp);
        } else {
            // Hata durumunda varsayılan tarih
            date = new Date();
        }
        return date.toLocaleString();
    };

    const fetchGuides = async () => {
        try {
            const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, 'guides'));
            const guidesList: Guide[] = guidesSnapshot.docs.map((doc) => doc.data() as Guide);
            setGuides(guidesList);
            // GuidesModal görünürlüğünü ayarlamak için kullanıcı "My Guides" butonuna bastığında çağırılmalı
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Failed to fetch guides. Please try again.');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditModalVisible(true); // Testleri düzenlemek için modalı aç
        fetchTestsForUser(user); // Seçilen kullanıcı için testleri çek
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

    const getRangeForAge = (guides: Guide[], testType: string, ageInMonths: number): Range | null => {
        const guide = guides.find((guide) => guide.testType === testType);
        if (!guide) return null;

        const range = guide.ranges.find(
            (r) => ageInMonths >= (r.ageMin ?? 0) && ageInMonths <= (r.ageMax ?? Infinity)
        );
        return range || null;
    };

    const compareValueWithRange = (value: number, range: Range): "low" | "high" | "normal" => {
        if (range.min !== null && value < range.min) {
            return "low";
        } else if (range.max !== null && value > range.max) {
            return "high";
        } else {
            return "normal";
        }
    };

    const evaluateTestResult = (
        guides: Guide[],
        testType: string,
        ageInMonths: number,
        testValue: number
    ): { symbol: string; color: string } => {
        const range = getRangeForAge(guides, testType, ageInMonths);

        if (!range) {
            return { symbol: 'N/A', color: 'grey' };
        }

        const result = compareValueWithRange(testValue, range);

        switch (result) {
            case "low":
                return { symbol: '↓', color: 'red' };
            case "high":
                return { symbol: '↑', color: 'orange' };
            case "normal":
                return { symbol: '↔', color: 'green' };
            default:
                return { symbol: 'N/A', color: 'grey' };
        }
    };

    // TestItem bileşeni
    const TestItem = memo(({ test }: { test: Tests }) => {
        const testTypes = ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'];

        return (
            <View style={styles.testContainer}>
                <Text style={styles.testHeader}>
                    Test Timestamp: {formatTimestamp(test.timestamp)}
                </Text>
                {testTypes.map((testType) => {
                    const range = getRangeForAge(guides, testType, editingUser?.ageInMonths || 0);
                    const testValue = test[testType as keyof Tests] ?? null;

                    // Log range ve testValue
                    console.log(`Test Type: ${testType}, Test Value: ${testValue}, Range: ${JSON.stringify(range)}`);

                    // testValue'nun number olduğundan emin olun
                    const safeTestValue: number = typeof testValue === 'number' ? testValue : 0;

                    const { symbol, color } = evaluateTestResult(guides, testType, editingUser?.ageInMonths || 0, safeTestValue);

                    // Log symbol ve color
                    console.log(`Symbol: ${symbol}, Color: ${color}`);

                    return (
                        <View key={`${test.id}-${testType}`} style={styles.testRow}>
                            <Text style={styles.testLabel}>{testType}:</Text>
                            <Text style={styles.testValue}>{testValue !== null ? testValue.toString() : 'N/A'}</Text>
                            <Text style={styles.referenceText}>
                                {range ? `${range.min} - ${range.max}` : "N/A"}
                            </Text>
                            <Text style={[styles.statusText, { color }]}>
                                {symbol}
                            </Text>
                            <Text style={styles.statusText}>
                                {symbol}
                            </Text>
                        </View>
                    );
                })}
                <Button title="Edit Test" onPress={() => handleEditTest(test)} />
            </View>
        );
    });

    const handleEditTest = (test: Tests) => {
        setSelectedTest(test.id || null);
        setEditModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerButtons}>
                <Button title="My Guides" onPress={() => { fetchGuides(); setGuidesModalVisible(true); }} color="#5cb85c" />
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
                            <Text style={styles.label}>Age in Months:</Text> {item.ageInMonths ?? 'N/A'}
                        </Text>
                        <Button title="Edit Tests" onPress={() => handleEdit(item)} />
                        <View style={styles.addTestButton}>
                            <Button title="Add Test" onPress={() => addTestForUser(item)} color="#5cb85c" />
                        </View>
                    </View>
                )}
            />

            {/* Create Guide Modal */}
            {guideModalVisible && (
                <Modal visible={guideModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <ScrollView>
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
                                                <Text>Age Group</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Age Group"
                                                    value={range.ageGroup}
                                                    onChangeText={(value) => handleAgeGroupChange(index, value)}
                                                />
                                                <Text>Age Min</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Age Min"
                                                    keyboardType="numeric"
                                                    onChangeText={(value) => handleGuideChange(index, "ageMin", value)}
                                                />
                                                <Text>Age Max</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Age Max"
                                                    keyboardType="numeric"
                                                    onChangeText={(value) => handleGuideChange(index, "ageMax", value)}
                                                />
                                                <Text>Min</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Min"
                                                    keyboardType="numeric"
                                                    onChangeText={(value) => handleGuideChange(index, "min", value)}
                                                />
                                                <Text>Max</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Max"
                                                    keyboardType="decimal-pad"
                                                    onChangeText={(value) => handleGuideChange(index, "max", value)}
                                                />
                                            </View>
                                        ))}
                                        <Button title="Add Age Group" onPress={addAgeGroup} />
                                        <View style={styles.buttonRow}>
                                            <Button title="Save Guide" onPress={saveGuideToDatabase} />
                                            <Button
                                                title="Cancel"
                                                onPress={() => setGuideModalVisible(false)}
                                                color="#d9534f"
                                            />
                                            <Button
                                                title="Close"
                                                onPress={handleCloseGuideModal}
                                                color="#d9534f"
                                            />
                                        </View>
                                    </>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </Modal>
            )}

            {/* My Guides Modal */}
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
                                            <Text style={styles.tableCell}>Age Min</Text>
                                            <Text style={styles.tableCell}>Age Max</Text>
                                            <Text style={styles.tableCell}>Min</Text>
                                            <Text style={styles.tableCell}>Max</Text>
                                        </View>
                                        {guide.ranges.map((range, rangeIndex) => (
                                            <View key={rangeIndex} style={styles.tableRow}>
                                                <Text style={styles.tableCell}>{range.ageMin ?? "N/A"}</Text>
                                                <Text style={styles.tableCell}>{range.ageMax ?? "N/A"}</Text>
                                                <Text style={styles.tableCell}>{range.min ?? "N/A"}</Text>
                                                <Text style={styles.tableCell}>{range.max ?? "N/A"}</Text>
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
                                onChangeText={(text) => setNewTest({ ...newTest, IgA: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgM"
                                keyboardType="numeric"
                                onChangeText={(text) => setNewTest({ ...newTest, IgM: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG"
                                keyboardType="numeric"
                                onChangeText={(text) => setNewTest({ ...newTest, IgG: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG1"
                                keyboardType="numeric"
                                onChangeText={(text) => setNewTest({ ...newTest, IgG1: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG2"
                                keyboardType="numeric"
                                onChangeText={(text) => setNewTest({ ...newTest, IgG2: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG3"
                                keyboardType="numeric"
                                onChangeText={(text) => setNewTest({ ...newTest, IgG3: Number(text) })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG4"
                                keyboardType="numeric"
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
                                    ?.slice()
                                    .sort((a, b) => {
                                        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.seconds : 0;
                                        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.seconds : 0;
                                        return timeA - timeB; // Küçükten büyüğe sıralama
                                    })
                                    .map((currentTest, index, testsArray) => {
                                        // Bir önceki test
                                        const previousTest = index > 0 ? testsArray[index - 1] : null;

                                        return (
                                            <View key={currentTest.id || index} style={styles.tableContainer}>
                                                <Text style={styles.timestamp}>Timestamp: {formatTimestamp(currentTest.timestamp)}</Text>
                                                <View style={styles.tableHeader}>
                                                    <Text style={styles.tableCell}>Test Type</Text>
                                                    <Text style={styles.tableCell}>Value</Text>
                                                    <Text style={styles.tableCell}>Reference Range</Text>
                                                    <Text style={styles.tableCell}>Status</Text>
                                                    <Text style={styles.tableCell}>Change</Text>
                                                </View>
                                                {['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'].map((testType) => {
                                                    const range = getRangeForAge(guides, testType, editingUser.ageInMonths || 0);
                                                    const testValue = currentTest[testType as keyof Tests] ?? null;
                                                    const safeTestValue: number = typeof testValue === 'number' ? testValue : 0;
                                                    const { symbol, color } = evaluateTestResult(guides, testType, editingUser.ageInMonths || 0, safeTestValue);

                                                    // Debug log
                                                    console.log(`Test Type: ${testType}, Test Value: ${testValue}, Range: ${JSON.stringify(range)}, Symbol: ${symbol}, Color: ${color}`);

                                                    return (
                                                        <View key={`${currentTest.id}-${testType}`} style={styles.tableRow}>
                                                            <Text style={styles.tableCell}>{testType}</Text>
                                                            <Text style={styles.tableCell}>
                                                                {typeof testValue === 'number' ? testValue.toString() : 'N/A'}
                                                            </Text>
                                                            <Text style={styles.tableCell}>
                                                                {range ? `${range.min} - ${range.max}` : "N/A"}
                                                            </Text>
                                                            <Text style={[styles.tableCell, { color }]}>
                                                                {symbol}
                                                            </Text>
                                                            <Text style={styles.tableCell}>
                                                                {previousTest && typeof previousTest[testType as keyof Tests] === 'number'
                                                                    ? safeTestValue > (previousTest[testType as keyof Tests] as number)
                                                                        ? "▲"
                                                                        : safeTestValue < (previousTest[testType as keyof Tests] as number)
                                                                            ? "▼"
                                                                            : "▬"
                                                                    : "N/A"}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        );
                                    })}
                        </ScrollView>
                        <View style={styles.buttonRow}>
                            <Button title="Close" onPress={() => setEditModalVisible(false)} color="#d9534f" />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
    // Styles
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: 10,
            backgroundColor: '#ffffff',
        },
        headerButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            maxHeight: '80%',
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
            textAlign: 'center',
        },
        input: {
            height: 40,
            borderColor: '#ccc',
            borderWidth: 1,
            marginBottom: 10,
            paddingHorizontal: 10,
            borderRadius: 5,
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
            backgroundColor: '#f9f9f9',
            padding: 10,
            borderRadius: 5,
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
            borderBottomWidth: 1,
            borderColor: '#ccc',
        },
        tableCell: {
            flex: 1,
            textAlign: 'center',
            fontWeight: '600',
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
            flex: 1,
            height: 40,
            borderColor: '#ccc',
            borderWidth: 1,
            borderRadius: 5,
            marginHorizontal: 10,
            paddingHorizontal: 10,
        },
        addTestButton: {
            marginTop: 10,
        },
        inputContainer: {
            marginBottom: 10,
        },
        timestamp: { 
            marginBottom: 8, 
            fontWeight: 'bold' 
        },
        testContainer: {
            padding: 15,
            marginBottom: 15,
            backgroundColor: '#fff',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        testHeader: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 10,
            color: '#555',
        },
        testRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 5,
        },
        testLabel: {
            flex: 1,
            fontSize: 14,
            color: '#333',
        },
        testValue: {
            flex: 1,
            fontSize: 14,
            color: '#333',
        },
        referenceText: {
            flex: 1,
            fontSize: 14,
            color: '#333',
        },
        statusText: {
            flex: 1,
            fontSize: 14,
            fontWeight: 'bold',
        },
    });

    export default AdminDashboard;
