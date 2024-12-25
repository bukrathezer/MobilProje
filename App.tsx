import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FIREBASE_AUTH, FIRESTORE_DB } from './FirebaseConfig';

import Login from './app/screens/Login';
import SignUp from './app/screens/SignUp';
import ViewTests from './app/screens/ViewTests';
import AdminDashboard from './app/screens/AdminDashboard';

const Stack = createNativeStackNavigator();

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
    const [initializing, setInitializing] = useState(true);

    const fetchUserInfo = async (uid: string) => {
        try {
            const userDocRef = doc(FIRESTORE_DB, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    firstName: data?.firstName || 'Guest',
                    lastName: data?.lastName || '',
                    role: data?.role || 'user',
                };
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
        return null;
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
            setInitializing(false);
        });
        return unsubscribe;
    }, []);

    if (initializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {user && userInfo ? (
                    userInfo.role === 'admin' ? (
                        <Stack.Screen
                            name="AdminDashboard"
                            component={AdminDashboard}
                            options={{ headerShown: false }}
                        />
                    ) : (
                        <Stack.Screen
                            name="ViewTests"
                            options={{ headerShown: false }}
                        >
                            {() => (
                                <ViewTests
                                    userId={user.uid}
                                    firstName={userInfo.firstName}
                                    lastName={userInfo.lastName}
                                />
                            )}
                        </Stack.Screen>
                    )
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
