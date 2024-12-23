import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FIREBASE_AUTH, FIRESTORE_DB } from './FirebaseConfig';

import Login from './app/screens/Login';
import SignUp from './app/screens/SignUp';
import List from './app/screens/List';
import Details from './app/screens/Details';
import { View, Text, StyleSheet, Button } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
    const [user, setUser] = useState<User | null>(null); // Firebase User
    const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; role: string } | null>(null); // Kullanıcı Bilgileri

    // Kullanıcı bilgilerini Firestore'dan al
    const fetchUserInfo = async (uid: string) => {
        const userDocRef = doc(FIRESTORE_DB, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
            };
        }
        return null;
    };

    const handleSignOut = async () => {
        try {
            await signOut(FIREBASE_AUTH);
            alert('Successfully logged out.');
        } catch (error) {
            console.log('Error signing out:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const info = await fetchUserInfo(currentUser.uid);
                setUserInfo(info);
            } else {
                setUser(null);
                setUserInfo(null);
            }
        });

        return unsubscribe;
    }, []);

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                {user && userInfo ? (
                    <>
                        <Stack.Screen
                            name="List"
                            options={{
                                headerRight: () => (
                                    <Text style={styles.adminText}>
                                        {userInfo.role === 'admin' ? 'Admin' : ''}
                                    </Text>
                                ),
                                headerLeft: () => (
                                    <Text style={styles.welcomeText}>
                                        Hoşgeldiniz {userInfo.firstName} {userInfo.lastName}
                                    </Text>
                                ),
                            }}
                        >
                            {() => (
                                <View style={styles.container}>
                                    <Text style={styles.welcomeText}>
                                        Hoşgeldiniz {userInfo.firstName} {userInfo.lastName}
                                    </Text>
                                    <Button title="Logout" onPress={handleSignOut} color="red" />
                                </View>
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="Details" component={Details} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                        <Stack.Screen name="SignUp" component={SignUp} options={{ title: 'Create Account' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'green',
    },
    adminText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'blue',
        marginRight: 10,
    },
});
