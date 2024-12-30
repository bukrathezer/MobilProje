import React, { useState, useEffect,useCallback  } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, ScrollView,ActivityIndicator  } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';

interface Tests {
    timestamp: number;
    IgA?: number | null;
    IgG?: number | null;
    IgG1?: number | null;
    IgG2?: number | null;
    IgG3?: number | null;
    IgG4?: number | null;
    IgM?: number | null;
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

interface ViewTestsProps {
    userId: string;
    firstName: string;
    lastName: string;
}

const ViewTests = ({ userId, firstName, lastName }: ViewTestsProps) => {
    const [tests, setTests] = useState<Tests[]>([]);
    const [loading, setLoading] = useState(true);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loadingGuides, setLoadingGuides] = useState(true);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [showAnalyses, setShowAnalyses] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userInfo, setUserInfo] = useState({
        email: '',
        ageInMonths: null as number | null,
        firstName: '',
        lastName: '',
    });


    const handleSignOut = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            Alert.alert('Success', 'Çıkış yapıldı.');
        } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Çıkış yapılamadı. Lütfen tekrar deneyin.');
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match. Please try again.');
            return;
        }

        const user = FIREBASE_AUTH.currentUser;
        if (user) {
            try {
                await updatePassword(user, newPassword);
                Alert.alert('Success', 'Your password was updated successfully.');
                setNewPassword('');
                setConfirmPassword('');
            } catch (error) {
                console.error('Error updating password:', error);
                Alert.alert('Error', 'Failed to update password. Please try again.');
            }
        } else {
            Alert.alert('Error', 'No user is currently signed in.');
        }
    };

    const handleSaveUserInfo = async () => {
        const userRef = doc(FIRESTORE_DB, 'users', userId);
        try {
            await updateDoc(userRef, {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                email: userInfo.email,
                ageInMonths: userInfo.ageInMonths,
            });
            Alert.alert('Success', 'Your information has been updated.');
        } catch (error) {
            console.error('Error updating user info:', error);
            Alert.alert('Error', 'Failed to update user information. Please try again.');
        }
    };

    const fetchUserData = async () => {
        try {
            const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserInfo({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    ageInMonths: data.ageInMonths || null ,
                });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    

    const fetchTestsForUser = async () => {
        try {
            const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${userId}/tests`));
            const testsList: Tests[] = testsSnapshot.docs.map((doc) => {
                const data = doc.data();
                if (data.timestamp && data.timestamp instanceof Timestamp) {
                    data.timestamp = data.timestamp.toDate().getTime(); // Convert Timestamp to milliseconds
                }
                return data as Tests;
            });
            setTests(testsList);
        } catch (error) {
            console.error('Error fetching tests:', error);
            Alert.alert('Error', 'Veri çekme sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Fetch Guides
    const fetchGuides = async () => {
        try {
            const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, 'guides'));
            const guidesList: Guide[] = guidesSnapshot.docs.map((doc) => doc.data() as Guide);
            setGuides(guidesList);
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Guides verilerini çekerken hata oluştu.');
        } finally {
            setLoadingGuides(false);
        }
    };

    const getGuideForTestAndAge = (guides: Guide[], testType: string, age: number): Range | null => {
        const guide = guides.find(g => g.testType === testType);
        if (!guide) return null;

        const range = guide.ranges.find(r => (r.ageMin || 0) <= age && age <= (r.ageMax || Infinity));
        return range || null;
    };
    const getStatus = (value: number, min: number | null, max: number | null): { symbol: string, color: string } => {
        if (min !== null && value < min) {
            return { symbol: '↓', color: 'red' };
        } else if (max !== null && value > max) {
            return { symbol: '↑', color: 'orange' };
        } else {
            return { symbol: '↔', color: 'green' };
        }
    };

    useEffect(() => {
        fetchUserData();
        fetchTestsForUser();
        fetchGuides();
    }, []);

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
                    Hoşgeldiniz {userInfo.firstName} {userInfo.lastName}
                </Text>
                <Button title="Log Out" onPress={handleSignOut} color="red" />
            </View>

            {/* User Information Button */}
            <Button
                title="My User Information"
                onPress={() => {
                    setShowUserInfo(true);
                    setShowAnalyses(false);
                }}
            />

            {showUserInfo && (
                <View style={styles.userInfo}>
                    <Text style={styles.userInfoHeader}>My User Information</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        value={userInfo.firstName}
                        onChangeText={(text) => setUserInfo({ ...userInfo, firstName: text })}
                        accessibilityLabel="First Name Input"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        value={userInfo.lastName}
                        onChangeText={(text) => setUserInfo({ ...userInfo, lastName: text })}
                        accessibilityLabel="Last Name Input"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={userInfo.email}
                        onChangeText={(text) => setUserInfo({ ...userInfo, email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        accessibilityLabel="Email Input"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Age in Months"
                        value={userInfo.ageInMonths !== null ? userInfo.ageInMonths.toString() : ''}
                        onChangeText={(text) =>
                            setUserInfo({ ...userInfo, ageInMonths: text ? parseInt(text) : null })
                        }
                        keyboardType="numeric"
                        accessibilityLabel="Age in Months Input"
                    />
                    <Button title="Save Changes" onPress={handleSaveUserInfo} />
                    <TextInput
                        placeholder="New Password"
                        secureTextEntry
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        placeholder="Confirm Password"
                        secureTextEntry
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                    <Button title="Update Password" onPress={handleUpdatePassword} />
                </View>
            )}

            {/* Analyses Button */}
            <Button
                title="My Analyses"
                onPress={() => {
                    setShowAnalyses(true);
                    setShowUserInfo(false);
                    //fetchTestsForUser();
                }}
            />

{showAnalyses && (
                <Modal visible={showAnalyses} animationType="slide">
                    <ScrollView style={styles.scrollViewContainer}>
                        <Button
                            title="Close"
                            onPress={() => setShowAnalyses(false)}
                            color="red"
                        />
                        {tests.map((test, index) => {
                            const userAge = userInfo.ageInMonths || 0;
                            const testTypes = ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'];

                            return testTypes.map((testType) => {
                                const range = getGuideForTestAndAge(guides, testType, userAge);
                                const testValue = test[testType as keyof Tests] || 0;

                                if (!range) {
                                    return (
                                        <View key={`${index}-${testType}`} style={styles.tableContainer}>
                                            <Text style={styles.timestamp}>
                                                Timestamp: {formatTimestamp(test.timestamp)}
                                            </Text>
                                            <Text>Guide bulunamadı.</Text>
                                        </View>
                                    );
                                }

                                const { symbol, color } = getStatus(testValue, range.min, range.max);

                                return (
                                    <View key={`${index}-${testType}`} style={styles.tableContainer}>
                                        <Text style={styles.timestamp}>
                                            Timestamp: {formatTimestamp(test.timestamp)}
                                        </Text>
                                        <View style={styles.tableHeader}>
                                            <Text style={styles.tableCell}>Test Type</Text>
                                            <Text style={styles.tableCell}>Value</Text>
                                            <Text style={styles.tableCell}>Referans Aralığı</Text>
                                            <Text style={styles.tableCell}>Durum</Text>
                                        </View>
                                        <View style={styles.tableRow}>
                                            <Text style={styles.tableCell}>{testType}</Text>
                                            <Text style={styles.tableCell}>{testValue ?? 'N/A'}</Text>
                                            <Text style={styles.tableCell}>
                                                {range.min} - {range.max}
                                            </Text>
                                            <Text style={[styles.tableCell, { color }]}>
                                                {symbol}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            });
                        })}
                    </ScrollView>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f8f9fa',
    },
    scrollViewContainer: {
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
    userInfo: {
        marginBottom: 20,
    },
    userInfoHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
        borderRadius: 5,
        marginBottom: 10,
    },
    tableContainer: {
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fff',
    },
    timestamp: {
        fontSize: 14,
        color: '#777',
        marginBottom: 10,
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
    tableCell: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ViewTests;
