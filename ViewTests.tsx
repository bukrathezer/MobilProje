import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, ScrollView } from 'react-native';
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

interface ViewTestsProps {
    userId: string;
    firstName: string;
    lastName: string;
}

const ViewTests = ({ userId, firstName, lastName }: ViewTestsProps) => {
    const [tests, setTests] = useState<Tests[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userInfo, setUserInfo] = useState({
        email: '',
        age: null as number | null,
        firstName: '',
        lastName: '',
    });

    const [showUserInfo, setShowUserInfo] = useState(false);
    const [showAnalyses, setShowAnalyses] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            alert('Çıkış yapıldı.');
        } catch (error) {
            console.error('Error signing out:', error);
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
                age: userInfo.age,
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
                    age: data.age || '' ,
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
                data.timestamp = data.timestamp.toDate().getTime(); // Timestamp'i milisaniye dönüştür
            }
            return data as Tests;
        });
        setTests(testsList);
    } catch (error) {
        console.error('Error fetching tests:', error);
        Alert.alert('Error', 'Veri çekme sırasında bir hata oluştu.');
    }
};

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    useEffect(() => {
        fetchUserData();
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
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        value={userInfo.lastName}
                        onChangeText={(text) => setUserInfo({ ...userInfo, lastName: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={userInfo.email}
                        onChangeText={(text) => setUserInfo({ ...userInfo, email: text })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Age"
                        value={userInfo.age ? userInfo.age.toString() : ''}
                        onChangeText={(text) =>
                            setUserInfo({ ...userInfo, age: text ? parseInt(text) : null })
                        }
                        keyboardType="numeric"
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
                    fetchTestsForUser();
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
                        {tests.map((test, index) => (
                            <View key={index} style={styles.tableContainer}>
                                <Text style={styles.timestamp}>
                                    Timestamp: {formatTimestamp(test.timestamp)}
                                </Text>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableCell}>Test Type</Text>
                                    <Text style={styles.tableCell}>Value</Text>
                                </View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgA</Text><Text style={styles.tableCell}>{test.IgA ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgG</Text><Text style={styles.tableCell}>{test.IgG ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgG1</Text><Text style={styles.tableCell}>{test.IgG1 ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgG2</Text><Text style={styles.tableCell}>{test.IgG2 ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgG3</Text><Text style={styles.tableCell}>{test.IgG3 ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgG4</Text><Text style={styles.tableCell}>{test.IgG4 ?? 'N/A'}</Text></View>
                                <View style={styles.tableRow}><Text style={styles.tableCell}>IgM</Text><Text style={styles.tableCell}>{test.IgM ?? 'N/A'}</Text></View>
                            </View>
                        ))}
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
