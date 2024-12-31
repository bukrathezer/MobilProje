// ViewTests.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, SafeAreaView, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, ScrollView, ActivityIndicator 
} from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import Constants from "expo-constants";

interface Tests {
    timestamp: any;  // Firestore'dan gelebilir => { seconds: number, nanoseconds: number } veya number
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
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        // Eğer timestamp Firestore Timestamp tipindeyse:
        if (timestamp.seconds) {
            const date = new Date(timestamp.seconds * 1000);
            return date.toLocaleString();
        } 
        // Eğer doğrudan milisaniye ise:
        if (typeof timestamp === 'number') {
            const date = new Date(timestamp);
            return date.toLocaleString();
        }
        return 'N/A';
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
        <SafeAreaView style={styles.container}>
          <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    Hoş Geldiniz {userInfo.firstName} {userInfo.lastName}
                </Text>
                <Button title="ÇIKIŞ YAP" onPress={handleSignOut} color="red" />
            </View>

            {/* 2 Sabit Boyutlu Buton */}
            <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Hesap Ayarları"
                        onPress={() => {
                            setShowUserInfo(true);
                            setShowAnalyses(false);
                        }}
                        color="#007bff"
                    />
                </View>
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Tahlil Sonuçları"
                        onPress={() => {
                            setShowUserInfo(false);
                            setGuideSelectionModalVisible(true);
                        }}
                        color="#28a745"
                    />
                </View>
            </View>

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
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Age in Months"
                        value={userInfo.ageInMonths !== null ? userInfo.ageInMonths.toString() : ''}
                        onChangeText={(text) =>
                            setUserInfo({ ...userInfo, ageInMonths: text ? parseInt(text) : null })
                        }
                        keyboardType="numeric"
                    />
                    <Button title="Save Changes" onPress={handleSaveUserInfo} color="#16a085" />

                    <Text style={[styles.userInfoHeader, { marginTop: 20 }]}>Change Password</Text>
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
                    <Button title="Update Password" onPress={handleUpdatePassword} color="#16a085" />
                </View>
            )}

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
                                    setShowAnalyses(true);
                                }}
                                color="#2ecc71"
                            />
                        ))}
                        <Button
                            title="Close"
                            onPress={() => setGuideSelectionModalVisible(false)}
                            color="#c0392b"
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
                        <View style={{ marginVertical: 10 }}>
                            <Button
                                title="Close"
                                onPress={() => setShowAnalyses(false)}
                                color="#c0392b"
                            />
                        </View>
                        {tests.length > 0 ? (
                            tests
                                .slice()
                                // en yeni en üstte
                                .sort((a, b) => {
                                    const timeA = a.timestamp?.seconds || 0;
                                    const timeB = b.timestamp?.seconds || 0;
                                    return timeB - timeA;
                                })
                                .map((test, index) => {
                                    const userAge = userInfo.ageInMonths || 0;
                                    const testTypes = ['IgA', 'IgM', 'IgG', 'IgG1', 'IgG2', 'IgG3', 'IgG4'];

                                    return testTypes.map((testType) => {
                                        const guideList = guides[selectedGuide];
                                        if (!guideList) return null; // Emniyet

                                        const range = getGuideForTestAndAge(guideList, testType, userAge);
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#ecf0f1',
        paddingTop: Constants.statusBarHeight
    },
    scrollViewContainer: {
        flex: 1,
        padding: 10,
        backgroundColor: '#ecf0f1',
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

    // Butonları dikey eksende ortalamak ve boyutu sabit tutmak için
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonWrapper: {
        width: 180,          // Sabit genişlik
        height: 50,          // Sabit yükseklik
        marginHorizontal: 10,
        borderRadius: 12,
        overflow: 'hidden',
        // İçerikteki metin büyüyüp küçülse bile
        // bu <View> boyutu değişmez
        justifyContent: 'center',  // Buton metnini dikey ortala
        alignItems: 'center',      // Buton metnini yatay ortala
    },

    userInfo: {
        marginBottom: 20,
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 8,
    },
    userInfoHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#34495e',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#fff',
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    tableContainer: {
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fff',
    },
    timestamp: {
        fontSize: 14,
        color: '#777',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#dfe6e9',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginBottom: 5,
    },
    tableCell: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        color: '#2c3e50',
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 0.5,
        borderColor: '#ddd',
    },
    noTestsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#555',
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
        borderRadius: 12,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#2c3e50',
    },
});

export default ViewTests;
