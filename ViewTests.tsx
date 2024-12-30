// ViewTests.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, ScrollView, ActivityIndicator 
} from 'react-native';
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
    const [guides, setGuides] = useState<{ [key: string]: Guide[] }>({});
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
    const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
    const [guideSelectionModalVisible, setGuideSelectionModalVisible] = useState<boolean>(false);

    // Çıkış Yapma Fonksiyonu
    const handleSignOut = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            Alert.alert('Success', 'Çıkış yapıldı.');
        } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Çıkış yapılamadı. Lütfen tekrar deneyin.');
        }
    };

    // Şifre Güncelleme Fonksiyonu
    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Şifreler uyuşmuyor. Lütfen tekrar deneyin.');
            return;
        }

        const user = FIREBASE_AUTH.currentUser;
        if (user) {
            try {
                await updatePassword(user, newPassword);
                Alert.alert('Success', 'Şifreniz başarıyla güncellendi.');
                setNewPassword('');
                setConfirmPassword('');
            } catch (error) {
                console.error('Error updating password:', error);
                Alert.alert('Error', 'Şifre güncellenemedi. Lütfen tekrar deneyin.');
            }
        } else {
            Alert.alert('Error', 'Şu anda oturum açmış bir kullanıcı yok.');
        }
    };

    // Kullanıcı Bilgilerini Güncelleme Fonksiyonu
    const handleSaveUserInfo = async () => {
        const userRef = doc(FIRESTORE_DB, 'users', userId);
        try {
            await updateDoc(userRef, {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                email: userInfo.email,
                ageInMonths: userInfo.ageInMonths,
            });
            Alert.alert('Success', 'Bilgileriniz güncellendi.');
        } catch (error) {
            console.error('Error updating user info:', error);
            Alert.alert('Error', 'Kullanıcı bilgileri güncellenemedi. Lütfen tekrar deneyin.');
        }
    };

    // Kullanıcı Verilerini Çekme Fonksiyonu
    const fetchUserData = async () => {
        try {
            const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserInfo({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    ageInMonths: data.ageInMonths || null,
                });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            Alert.alert('Error', 'Kullanıcı verileri çekilemedi.');
        } finally {
            setLoading(false);
        }
    };

    // Kullanıcının Testlerini Çekme Fonksiyonu
    const fetchTestsForUser = async () => {
        try {
            const testsSnapshot = await getDocs(collection(FIRESTORE_DB, `users/${userId}/tests`));
            const testsList: Tests[] = testsSnapshot.docs.map((doc) => {
                const data = doc.data();
                if (data.timestamp && data.timestamp instanceof Timestamp) {
                    data.timestamp = data.timestamp.toDate().getTime(); // Firestore Timestamp'ı milisaniyeye çevirme
                }
                return data as Tests;
            });
            setTests(testsList);
        } catch (error) {
            console.error('Error fetching tests:', error);
            Alert.alert('Error', 'Tahlil verileri çekilemedi.');
        } finally {
            setLoading(false);
        }
    };

    // Timestamp'i Okunabilir Formata Çevirme Fonksiyonu
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Rehberleri Çekme Fonksiyonu
    const fetchGuides = async () => {
        const guideCollections = ['guides', 'Guides2', 'Guides3', 'Guides4', 'Guides5'];
        const guidesData: { [key: string]: Guide[] } = {};

        try {
            for (const collectionName of guideCollections) {
                const guidesSnapshot = await getDocs(collection(FIRESTORE_DB, collectionName));
                guidesData[collectionName] = guidesSnapshot.docs.map((doc) => doc.data() as Guide);
            }
            setGuides(guidesData);
        } catch (error) {
            console.error('Error fetching guides:', error);
            Alert.alert('Error', 'Rehber verileri çekilemedi.');
        } finally {
            setLoadingGuides(false);
        }
    };

    // Rehber Türü ve Yaşa Göre Range Bulma Fonksiyonu
    const getGuideForTestAndAge = useCallback(
        (guideList: Guide[], testType: string, age: number): Range | null => {
            const guide = guideList.find(g => g.testType === testType);
            if (!guide) return null;

            const range = guide.ranges.find(r => (r.ageMin || 0) <= age && age <= (r.ageMax || Infinity));
            return range || null;
        },
        []
    );

    // Test Değerine Göre Durumu Belirleme Fonksiyonu
    const getStatus = useCallback(
        (value: number, min: number | null, max: number | null): { symbol: string, color: string } => {
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

    // Kullanıcı verilerini ve rehberleri çekme
    useEffect(() => {
        fetchUserData();
        fetchTestsForUser();
        fetchGuides();
    }, []);

    if (loading || loadingGuides) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
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

            {/* Kullanıcı Bilgilerini Gösterme Butonu */}
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
                        accessibilityLabel="New Password Input"
                    />
                    <TextInput
                        placeholder="Confirm Password"
                        secureTextEntry
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        accessibilityLabel="Confirm Password Input"
                    />
                    <Button title="Update Password" onPress={handleUpdatePassword} />
                </View>
            )}

            {/* Analizleri Gösterme Butonu */}
            <Button
                title="My Analyses"
                onPress={() => {
                    setShowAnalyses(true);
                    setShowUserInfo(false);
                    setGuideSelectionModalVisible(true);
                }}
            />

            {/* Rehber Seçim Modalı */}
            <Modal
                visible={guideSelectionModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setGuideSelectionModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Guide for Analysis</Text>
                        {Object.keys(guides).map((guideName, index) => (
                            <Button
                                key={index}
                                title={`Select Kilavuz${index + 1} (${guideName})`}
                                onPress={() => {
                                    setSelectedGuide(guideName);
                                    setGuideSelectionModalVisible(false);
                                }}
                            />
                        ))}
                        <Button
                            title="Close"
                            onPress={() => setGuideSelectionModalVisible(false)}
                            color="red"
                        />
                    </View>
                </View>
            </Modal>

            {/* Analizler Modalı */}
            {showAnalyses && selectedGuide && (
                <Modal
                    visible={showAnalyses && selectedGuide !== null}
                    animationType="slide"
                    onRequestClose={() => setShowAnalyses(false)}
                >
                    <ScrollView style={styles.scrollViewContainer}>
                        <Button
                            title="Close"
                            onPress={() => setShowAnalyses(false)}
                            color="red"
                        />
                        {tests.length > 0 ? (
                            tests.map((test, index) => {
                                const userAge = userInfo.ageInMonths || 0;
                                const testTypes = ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'];

                                return testTypes.map((testType) => {
                                    const range = getGuideForTestAndAge(guides[selectedGuide], testType, userAge);
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
                            })
                        ) : (
                            <Text style={styles.noTestsText}>No tests available.</Text>
                        )}
                    </ScrollView>
                </Modal>
            )}
        </View>
    );

}

    // Stil Tanımlamaları (styles) Bileşenin Dışında Tanımlanmalıdır
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
            alignItems: 'center',
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
        },
        
        noTestsText: {
            textAlign: 'center',
            marginTop: 20,
            fontSize: 16,
            color: '#555',
        },
    });

    export default ViewTests;
