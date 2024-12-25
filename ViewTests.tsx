import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, Alert } from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';

interface ViewTestsProps {
    userId: string;
    firstName: string;
    lastName: string;
}

const ViewTests = ({ userId, firstName, lastName }: ViewTestsProps) => {
    const [tests, setTests] = useState<Record<string, number | null>>({});
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userInfo, setUserInfo] = useState<{ email: string; age: number | null }>({
        email: '',
        age: null,
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
    

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserInfo({
                        email: data.email || '',
                        age: data.age || null,
                    });
                    setTests(data.tests || {});
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
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

            {/* User Information */}
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
                    <Text>Name: {firstName}</Text>
                    <Text>Surname: {lastName}</Text>
                    <Text>Age: {userInfo.age !== null ? userInfo.age : 'N/A'}</Text>
                    <Text>Email: {userInfo.email || 'N/A'}</Text>
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
                }}
            />

            {showAnalyses && (
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
                            <Text style={styles.tableHeaderText}>Analysis Name</Text>
                            <Text style={styles.tableHeaderText}>Value</Text>
                        </View>
                    )}
                />
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
