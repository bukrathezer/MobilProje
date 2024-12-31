// AdminDashboard.tsx

import React, { useEffect, useState, useCallback, memo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    Button,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    ToastAndroid,
} from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { NavigationProp } from '@react-navigation/native';
import Constants from "expo-constants";

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
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [guideModalVisible, setGuideModalVisible] = useState(false);
    const [guidesModalVisible, setGuidesModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userTests, setUserTests] = useState<{ [userId: string]: Tests[] }>({});
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [guideData, setGuideData] = useState<Guide | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchText, setSearchText] = useState<string>('');

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

    const [analysisModalVisible, setAnalysisModalVisible] = useState<boolean>(false);
    const [selectedUserForAnalysis, setSelectedUserForAnalysis] = useState<User | null>(null);
    const [analysisResults, setAnalysisResults] = useState<Array<{
        testType: string;
        value: number | null;
        referenceRange: string;
        status: string;
        color: string;
    }>>([]);

    // Hızlı Tahlil
    const [hizliTahlilModalVisible, setHizliTahlilModalVisible] = useState<boolean>(false);
    const [hizliTahlilResultsModalVisible, setHizliTahlilResultsModalVisible] = useState<boolean>(false);

    const [hizliTahlilValues, setHizliTahlilValues] = useState<{
        IgA: string;
        IgM: string;
        IgG: string;
        IgG1: string;
        IgG2: string;
        IgG3: string;
        IgG4: string;
        age: string;
    }>({
        IgA: '',
        IgM: '',
        IgG: '',
        IgG1: '',
        IgG2: '',
        IgG3: '',
        IgG4: '',
        age: '',
    });

    const [hizliTahlilResults, setHizliTahlilResults] = useState<Array<{
        testType: string;
        collectionName: string;
        value: number | null;
        referenceRange: string;
        status: string;
        color: string;
    }>>([]);

    const guideCollections = ['guides', 'Guides2', 'Guides3', 'Guides4', 'Guides5'];
    const [isGuideSelectionModalVisible, setIsGuideSelectionModalVisible] = useState<boolean>(false);
    const [selectedGuideCollection, setSelectedGuideCollection] = useState<string | null>(null);

    // Tests veri parse
    const parseTest = (data: any): Tests => ({
        IgA: typeof data.IgA === 'number' ? data.IgA : null,
        IgM: typeof data.IgM === 'number' ? data.IgM : null,
        IgG: typeof data.IgG === 'number' ? data.IgG : null,
        IgG1: typeof data.IgG1 === 'number' ? data.IgG1 : null,
        IgG2: typeof data.IgG2 === 'number' ? data.IgG2 : null,
        IgG3: typeof data.IgG3 === 'number' ? data.IgG3 : null,
        IgG4: typeof data.IgG4 === 'number' ? data.IgG4 : null,
        timestamp: data.timestamp,
    });

    // getStatus (value null değilmiş gibi davranacaksanız, parametre tipini güncelleyebilirsiniz)
    const getStatus = useCallback(
        (value: number, min: number | null, max: number | null): { symbol: string; color: string } => {
            if (min !== null && value < min) {
                return { symbol: '↓', color: 'red' };
            } else if (max !== null && value > max) {
                return { symbol: '↑', color: 'orange' };
            } else {
                return { symbol: '↔', color: 'green' };
            }
        },
        []
    );

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
                setFilteredUsers(usersList);
                // Kullanıcı testlerini çek
                fetchUserTests(usersList);
            } catch (error) {
                console.error('Error fetching users:', error);
                Alert.alert('Error', 'Failed to fetch users. Please try again.');
            }
        };

        const fetchUserTests = async (usersList: User[]) => {
            try {
                const testsPromises = usersList.map(async (user) => {
                    const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${user.id}/tests`));
                    const testsList: Tests[] = testsSnapshot.docs.map((doc) => parseTest(doc.data()));
                    return { userId: user.id, tests: testsList };
                });

                const testsResults = await Promise.all(testsPromises);
                const testsData: { [userId: string]: Tests[] } = {};
                testsResults.forEach(({ userId, tests }) => {
                    testsData[userId] = tests;
                });
                setUserTests(testsData);
            } catch (error) {
                console.error('Error fetching user tests:', error);
                Alert.alert('Error', 'Failed to fetch user tests.');
            }
        };

        const fetchGuides = async () => {
            // Başlangıçta rehberleri çekmek yerine seçilen koleksiyondan çekeceğiz
        };

        fetchUsers();
        fetchGuides();
    }, []);

    // 5 koleksiyonun her birini okur
    const fetchAllGuides = async (): Promise<Array<{ collectionName: string; guides: Guide[] }>> => {
        const allGuides: Array<{ collectionName: string; guides: Guide[] }> = [];
        try {
            for (const cName of guideCollections) {
                const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, cName));
                const guidesList: Guide[] = guidesSnapshot.docs.map((doc) => doc.data() as Guide);
                allGuides.push({ collectionName: cName, guides: guidesList });
            }
            console.log('All Guides from all collections:', allGuides);
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Failed to fetch guides.');
        }
        return allGuides;
    };

    const handleGuideCollectionSelect = async (collectionName: string) => {
        setSelectedGuideCollection(collectionName);
        setIsGuideSelectionModalVisible(false);
        const selectedSnapshot = await getDocs(collection(FIRESTORE_DB, collectionName));
        const selectedGuides = selectedSnapshot.docs.map((doc) => doc.data() as Guide);
        setGuides(selectedGuides);
        performAnalysis(editingUser, selectedGuides);
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (text.trim() === '') {
            setFilteredUsers(users);
        } else {
            const lowercasedText = text.toLowerCase();
            const filtered = users.filter(user =>
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
            if (!prev) return prev;
            const updatedRanges = [...prev.ranges];
            updatedRanges[index] = {
                ...updatedRanges[index],
                [field]: value ? parseFloat(value) : null,
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
            if (!prev) return prev;
            return {
                ...prev,
                ranges: [
                    ...prev.ranges,
                    {
                        ageGroup: "",
                        ageMin: 0,
                        ageMax: 0,
                        min: 0,
                        max: 0
                    },
                ],
            };
        });
    };

    const saveGuideToDatabase = async () => {
        if (!guideData || !selectedTest) return;
        if (guideData.ranges.length === 0) {
            Alert.alert('Validation Error', 'Please add at least one age range.');
            return;
        }
        for (const range of guideData.ranges) {
            if (range.ageMin === null || range.ageMax === null || range.min === null || range.max === null) {
                Alert.alert('Validation Error', 'All range fields must be filled.');
                return;
            }
        }
        try {
            await addDoc(collection(FIRESTORE_DB, 'guides'), guideData);
            ToastAndroid.show('Guide saved successfully!', ToastAndroid.SHORT);
            setGuideModalVisible(false);
            setSelectedTest(null);
            setGuideData(null);
        } catch (error) {
            console.error('Error saving guide:', error);
            Alert.alert('Error', 'Failed to save guide. Please try again.');
        }
    };

    const addTestForUser = (user: User) => {
        setEditingUser(user);
        setModalVisible(true);
    };

    const handleTestSave = async () => {
        if (!editingUser) return;
        const testValues = Object.values(newTest).filter((value) => value !== null && value !== undefined);
        if (testValues.length === 0) {
            Alert.alert('Validation Error', 'Please enter at least one test value.');
            return;
        }
        try {
            const userTestsCollectionRef = collection(FIRESTORE_DB, `users/${editingUser.id}/tests`);
            await addDoc(userTestsCollectionRef, {
                ...newTest,
                timestamp: newTest.timestamp,
            });
            ToastAndroid.show('Test added successfully!', ToastAndroid.SHORT);
            setModalVisible(false);
            setNewTest({
                IgA: null,
                IgM: null,
                IgG: null,
                IgG1: null,
                IgG2: null,
                IgG3: null,
                IgG4: null,
                timestamp: new Date(),
            });
            fetchTestsForUser(editingUser);
        } catch (error) {
            console.error('Error adding test:', error);
            Alert.alert('Error', 'Failed to add test. Please try again.');
        }
    };

    const fetchTestsForUser = async (user: User) => {
        try {
            const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${user.id}/tests`));
            const testsList: Tests[] = testsSnapshot.docs.map((doc) => parseTest(doc.data()));
            setUserTests((prevState) => ({
                ...prevState,
                [user.id]: testsList,
            }));
        } catch (error) {
            console.error('Error fetching tests:', error);
            Alert.alert('Error', 'Failed to fetch tests for the user.');
        }
    };

    const formatTimestamp = (timestamp?: { seconds: number; nanoseconds: number }): string => {
        if (!timestamp) return 'No Date';
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditModalVisible(true);
        if (!userTests[user.id]) {
            fetchTestsForUser(user);
        }
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

    // Hızlı Tahlil (çoklu rehber analizi)
    const handleHizliTahlilAnalyze = async () => {
        const age = parseFloat(hizliTahlilValues.age || '0');
        const IgA = hizliTahlilValues.IgA ? parseFloat(hizliTahlilValues.IgA) : null;
        const IgM = hizliTahlilValues.IgM ? parseFloat(hizliTahlilValues.IgM) : null;
        const IgG = hizliTahlilValues.IgG ? parseFloat(hizliTahlilValues.IgG) : null;
        const IgG1 = hizliTahlilValues.IgG1 ? parseFloat(hizliTahlilValues.IgG1) : null;
        const IgG2 = hizliTahlilValues.IgG2 ? parseFloat(hizliTahlilValues.IgG2) : null;
        const IgG3 = hizliTahlilValues.IgG3 ? parseFloat(hizliTahlilValues.IgG3) : null;
        const IgG4 = hizliTahlilValues.IgG4 ? parseFloat(hizliTahlilValues.IgG4) : null;

        const allCollections = await fetchAllGuides();

        const testTypes = [
            { key: 'IgA', value: IgA },
            { key: 'IgM', value: IgM },
            { key: 'IgG', value: IgG },
            { key: 'IgG1', value: IgG1 },
            { key: 'IgG2', value: IgG2 },
            { key: 'IgG3', value: IgG3 },
            { key: 'IgG4', value: IgG4 },
        ];

        const multiGuideResults: Array<{
            testType: string;
            collectionName: string;
            value: number | null;
            referenceRange: string;
            status: string;
            color: string;
        }> = [];

        testTypes.forEach((test) => {
            if (test.value === null) return;

            allCollections.forEach(({ collectionName, guides }) => {
                const foundGuide = guides.find(
                    (g) => g.testType.toLowerCase() === test.key.toLowerCase()
                );
                if (!foundGuide) {
                    multiGuideResults.push({
                        testType: test.key,
                        collectionName,
                        value: test.value,
                        referenceRange: 'N/A',
                        status: 'No guide found',
                        color: 'grey',
                    });
                } else {
                    const foundRange = foundGuide.ranges.find(
                        (r) => (r.ageMin ?? 0) <= age && age <= (r.ageMax ?? Infinity)
                    );
                    if (!foundRange) {
                        multiGuideResults.push({
                            testType: test.key,
                            collectionName,
                            value: test.value,
                            referenceRange: 'N/A',
                            status: 'No valid range for this age',
                            color: 'grey',
                        });
                    } else {
                        const { min, max } = foundRange;
                        // Burada value as number diyebiliriz, çünkü if (test.value === null) return'dan geçtik
                        const statusObj = getStatus(test.value as number, min, max);
                        multiGuideResults.push({
                            testType: test.key,
                            collectionName,
                            value: test.value,
                            referenceRange: `${min} - ${max}`,
                            status: statusObj.symbol,
                            color: statusObj.color,
                        });
                    }
                }
            });
        });

        setHizliTahlilResults(multiGuideResults);
        setHizliTahlilResultsModalVisible(true);
    };

    // Tek kılavuz analiz (kullanıcının en son testini)
    const performAnalysis = async (user: User | null, selectedGuides: Guide[]) => {
        if (!user) {
            Alert.alert('Error', 'No user selected for analysis.');
            return;
        }

        const userAge = user.ageInMonths || 0;
        const userTestsList = userTests[user.id] || [];

        if (userTestsList.length === 0) {
            Alert.alert('No Tests', 'This user has no test data.');
            return;
        }

        const sortedTests = userTestsList.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
        const latestTest = sortedTests[0];

        const testTypes = ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'];

        const results: Array<{
            testType: string;
            value: number | null;
            referenceRange: string;
            status: string;
            color: string;
        }> = [];

        testTypes.forEach((testType) => {
            const testValue = latestTest[testType as keyof Tests];
            if (testValue === null || testValue === undefined) return;

            const foundGuide = selectedGuides.find(
                (g) => g.testType.toLowerCase() === testType.toLowerCase()
            );
            if (!foundGuide) {
                results.push({
                    testType,
                    value: testValue,
                    referenceRange: 'N/A',
                    status: 'No valid guide for this test type',
                    color: 'grey',
                });
                return;
            }

            const foundRange = foundGuide.ranges.find(
                (r) => (r.ageMin ?? 0) <= userAge && userAge <= (r.ageMax ?? Infinity)
            );
            if (!foundRange) {
                results.push({
                    testType,
                    value: testValue,
                    referenceRange: 'N/A',
                    status: 'No valid range for this age',
                    color: 'grey',
                });
                return;
            }

            const { min, max } = foundRange;
            const statusObj = getStatus(testValue, min, max);

            results.push({
                testType,
                value: testValue,
                referenceRange: `${min} - ${max}`,
                status: statusObj.symbol,
                color: statusObj.color,
            });
        });

        setAnalysisResults(results);
        setSelectedUserForAnalysis(user);
        setAnalysisModalVisible(true);
    };

    // --------------------------------------------------
    // -- Render Kısmı --
    // --------------------------------------------------

    // Kullanıcı kartı
    const UserCard = memo(({ user }: { user: User }) => (
        <View style={styles.userCard}>
            <Text style={styles.userInfo}>
                <Text style={styles.label}>Name:</Text> {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.userInfo}>
                <Text style={styles.label}>Email:</Text> {user.email}
            </Text>
            <Text style={styles.userInfo}>
                <Text style={styles.label}>Age in Months:</Text> {user.ageInMonths ?? 'N/A'}
            </Text>
            <Button title="Edit Tests" onPress={() => handleEdit(user)} />
            <View style={styles.addTestButton}>
                <Button title="Add Test" onPress={() => addTestForUser(user)} color="#5cb85c" />
            </View>
            <View style={styles.addTestButton}>
                <Button title="View Analyses" onPress={() => setIsGuideSelectionModalVisible(true)} color="#0275d8" />
            </View>
        </View>
    ));

    const renderUserItem = ({ item }: { item: User }) => <UserCard user={item} />;

    return (
        <SafeAreaView style={styles.container}>
        <View style={styles.container}>
            <View style={styles.headerButtons}>
                <Button title="My Guides" onPress={() => setGuidesModalVisible(true)} color="#5cb85c" />
                <Button title="Create Guide" onPress={() => setGuideModalVisible(true)} color="#5cb85c" />

                {/* Hızlı Tahlil Butonu */}
                <Button
                    title="Hızlı Tahlil"
                    onPress={() => setHizliTahlilModalVisible(true)}
                    color="#5cb85c"
                />

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
                renderItem={renderUserItem}
            />

            {/* -------------------------- */}
            {/* Tek Kılavuz Seçim Modalı */}
            {/* -------------------------- */}
            {isGuideSelectionModalVisible && (
                <Modal visible={isGuideSelectionModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Guide Collection</Text>
                            {guideCollections.map((collectionName) => (
                                <Button
                                    key={collectionName}
                                    title={`Select ${collectionName}`}
                                    onPress={() => handleGuideCollectionSelect(collectionName)}
                                />
                            ))}
                            <Button
                                title="Cancel"
                                onPress={() => setIsGuideSelectionModalVisible(false)}
                                color="#d9534f"
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* -------------------------- */}
            {/* Tek Kılavuz Analiz Modalı */}
            {/* -------------------------- */}
            {analysisModalVisible && selectedUserForAnalysis && (
                <Modal visible={analysisModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                Analysis Results for {selectedUserForAnalysis.firstName} {selectedUserForAnalysis.lastName}
                            </Text>
                            <ScrollView>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableCell}>Test Type</Text>
                                    <Text style={styles.tableCell}>Value (Status)</Text>
                                    <Text style={styles.tableCell}>Reference Range</Text>
                                </View>
                                {analysisResults.map((result, index) => (
                                    <View key={index} style={styles.tableRow}>
                                        <Text style={styles.tableCell}>{result.testType}</Text>
                                        <Text style={styles.tableCell}>
                                            {result.value !== null ? `${result.value} (${result.status})` : 'N/A'}
                                        </Text>
                                        <Text style={styles.tableCell}>{result.referenceRange}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                            <Button
                                title="Close"
                                onPress={() => setAnalysisModalVisible(false)}
                                color="#d9534f"
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* ----------------------- */}
            {/* Guide Oluşturma Modalı */}
            {/* ----------------------- */}
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
                                            onPress={() => {
                                                setGuideModalVisible(false);
                                                setSelectedTest(null);
                                                setGuideData(null);
                                            }}
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
                                                onPress={() => {
                                                    setGuideModalVisible(false);
                                                    setSelectedTest(null);
                                                    setGuideData(null);
                                                }}
                                                color="#d9534f"
                                            />
                                            <Button
                                                title="Close"
                                                onPress={() => {
                                                    setGuideModalVisible(false);
                                                    setSelectedTest(null);
                                                    setGuideData(null);
                                                }}
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

            {/* ---------------------------- */}
            {/* Mevcut Rehberleri Gör Modalı */}
            {/* ---------------------------- */}
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

            {/* ------------------------ */}
            {/* Kullanıcıya Test Ekleme */}
            {/* ------------------------ */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Test for {editingUser?.firstName} {editingUser?.lastName}</Text>
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
                        </ScrollView>

                        <View style={styles.buttonRow}>
                            <Button title="Save Test" onPress={handleTestSave} color="#5cb85c" />
                            <Button title="Close" onPress={() => setModalVisible(false)} color="#d9534f" />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ------------------------------ */}
            {/* Kullanıcının Varolan Testleri */}
            {/* ------------------------------ */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Tests for {editingUser?.firstName} {editingUser?.lastName}</Text>
                        <ScrollView style={styles.scrollViewContainer}>
                            {editingUser?.id &&
                                userTests[editingUser.id]
                                    ?.slice()
                                    .sort((a, b) => {
                                        const timeA = a.timestamp?.seconds || 0;
                                        const timeB = b.timestamp?.seconds || 0;
                                        return timeA - timeB;
                                    })
                                    .map((test, index, tests) => {
                                        const previousTest = index > 0 ? tests[index - 1] : null;
                                        const analysis: Array<{
                                            testType: string;
                                            value: number | null;
                                            status: string;
                                            color: string;
                                        }> = [];

                                        ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'].forEach((testType) => {
                                            const testValue = test[testType as keyof Tests] ?? null;
                                            if (testValue === null) return;
                                            const foundGuide = guides.find(
                                                (g) => g.testType.toLowerCase() === testType.toLowerCase()
                                            );
                                            if (!foundGuide) {
                                                analysis.push({
                                                    testType,
                                                    value: testValue,
                                                    status: 'No valid range found',
                                                    color: 'grey',
                                                });
                                                return;
                                            }
                                            const userAge = editingUser.ageInMonths || 0;
                                            const foundRange = foundGuide.ranges.find(
                                                (r) => (r.ageMin ?? 0) <= userAge && userAge <= (r.ageMax ?? Infinity)
                                            );
                                            if (!foundRange) {
                                                analysis.push({
                                                    testType,
                                                    value: testValue,
                                                    status: 'No valid range found',
                                                    color: 'grey',
                                                });
                                                return;
                                            }
                                            const { min, max } = foundRange;
                                            const statusObj = getStatus(testValue, min, max);
                                            analysis.push({
                                                testType,
                                                value: testValue,
                                                status: statusObj.symbol,
                                                color: statusObj.color,
                                            });
                                        });

                                        return (
                                            <View key={index} style={styles.tableContainer}>
                                                <Text style={styles.timestamp}>Timestamp: {formatTimestamp(test.timestamp)}</Text>
                                                <View style={styles.tableHeader}>
                                                    <Text style={styles.tableCell}>Test Type</Text>
                                                    <Text style={styles.tableCell}>Value</Text>
                                                    <Text style={styles.tableCell}>Change</Text>
                                                    <Text style={styles.tableCell}>Status</Text>
                                                </View>
                                                {['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'].map((testType) => {
                                                    const testValue = test[testType as keyof Tests] ?? null;
                                                    const previousValue = previousTest ? previousTest[testType as keyof Tests] : null;
                                                    let changeSymbol = 'N/A';
                                                    let statusSymbol = 'N/A';
                                                    let color = 'grey';

                                                    if (previousValue !== null && testValue !== null) {
                                                        if (testValue > previousValue) {
                                                            changeSymbol = '▲';
                                                        } else if (testValue < previousValue) {
                                                            changeSymbol = '▼';
                                                        } else {
                                                            changeSymbol = '▬';
                                                        }
                                                    }

                                                    const analysisItem = analysis.find(a => a.testType === testType);
                                                    if (analysisItem) {
                                                        statusSymbol = analysisItem.status;
                                                        color = analysisItem.color;
                                                    }

                                                    return (
                                                        <View key={testType} style={styles.tableRow}>
                                                            <Text style={styles.tableCell}>{testType}</Text>
                                                            <Text style={styles.tableCell}>{testValue !== null ? testValue : 'N/A'}</Text>
                                                            <Text style={styles.tableCell}>{changeSymbol}</Text>
                                                            <Text style={[styles.tableCell, { color }]}>{statusSymbol}</Text>
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

            {/* -------------------------- */}
            {/* Hızlı Tahlil Giriş Modalı */}
            {/* -------------------------- */}
            <Modal visible={hizliTahlilModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Hızlı Tahlil</Text>
                        <ScrollView style={styles.scrollViewContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="IgA"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgA}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgA: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgM"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgM}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgM: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgG}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgG: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG1"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgG1}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgG1: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG2"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgG2}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgG2: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG3"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgG3}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgG3: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="IgG4"
                                keyboardType="numeric"
                                value={hizliTahlilValues.IgG4}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, IgG4: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Yaş (ay cinsinden veya dilediğiniz gibi)"
                                keyboardType="numeric"
                                value={hizliTahlilValues.age}
                                onChangeText={(text) => setHizliTahlilValues({ ...hizliTahlilValues, age: text })}
                            />
                        </ScrollView>
                        <View style={styles.buttonRow}>
                            <Button
                                title="Analiz Et"
                                onPress={() => {
                                    setHizliTahlilModalVisible(false);
                                    handleHizliTahlilAnalyze();
                                }}
                                color="#5cb85c"
                            />
                            <Button
                                title="Close"
                                onPress={() => setHizliTahlilModalVisible(false)}
                                color="#d9534f"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ----------------------------------------------------- */}
            {/* Hızlı Tahlil Sonuç Modal (Gruplanmış Görünüm)         */}
            {/* ----------------------------------------------------- */}
            <Modal visible={hizliTahlilResultsModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Hızlı Tahlil Sonuçları (5 Kılavuz)</Text>

                        <ScrollView>
                            {/** 
                             * 1) collectionName’e göre gruplayalım 
                             */}
                            {/** Örnek grouping */}
                            {(() => {
                                // Gruplama: { [collectionName]: [...sonuçlar], ... }
                                const groupedResults = hizliTahlilResults.reduce((acc, curr) => {
                                    if (!acc[curr.collectionName]) {
                                        acc[curr.collectionName] = [];
                                    }
                                    acc[curr.collectionName].push(curr);
                                    return acc;
                                }, {} as { [key: string]: typeof hizliTahlilResults });

                                // 2) Her bir collectionName için ayrı tablo
                                return Object.entries(groupedResults).map(([collectionName, results]) => (
                                    <View key={collectionName} style={styles.groupContainer}>
                                        <Text style={styles.groupTitle}>
                                            Kılavuz: {collectionName}
                                        </Text>
                                        <View style={styles.tableHeader}>
                                            <Text style={styles.tableCell}>Test Type</Text>
                                            <Text style={styles.tableCell}>Value (Status)</Text>
                                            <Text style={styles.tableCell}>Reference Range</Text>
                                        </View>
                                        {results.map((result, idx) => (
                                            <View key={idx} style={styles.tableRow}>
                                                <Text style={styles.tableCell}>{result.testType}</Text>
                                                <Text style={styles.tableCell}>
                                                    {result.value !== null
                                                        ? `${result.value} (${result.status})`
                                                        : 'N/A'
                                                    }
                                                </Text>
                                                <Text style={styles.tableCell}>{result.referenceRange}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ));
                            })()}
                        </ScrollView>

                        <Button
                            title="Close"
                            onPress={() => setHizliTahlilResultsModalVisible(false)}
                            color="#d9534f"
                        />
                    </View>
                </View>
            </Modal>

        </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#ffffff',
        paddingTop: Constants.statusBarHeight
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
    addTestButton: {
        marginTop: 10,
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
        flex: 1,
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
    inputContainer: {
        marginBottom: 10,
        width: '100%',
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
        padding: 10,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
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
    groupContainer: {
        marginBottom: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 10,
    },
    groupTitle: {
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
    timestamp: {
        marginBottom: 8,
        fontWeight: 'bold'
    },
});

export default AdminDashboard;
