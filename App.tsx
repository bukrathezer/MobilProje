import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FIREBASE_AUTH, FIRESTORE_DB } from './FirebaseConfig';

import Login from './app/screens/Login';
import SignUp from './app/screens/SignUp';
import ViewTests from './app/screens/ViewTests';

const Stack = createNativeStackNavigator();

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string } | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Kullanıcı bilgilerini Firestore'dan al
    const fetchUserInfo = async (uid: string) => {
        const userDocRef = doc(FIRESTORE_DB, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                firstName: data.firstName || '',
                lastName: data.lastName || '',
            };
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
            setInitializing(false); // Başlangıç durumu tamamlandı
        });

        return unsubscribe;
    }, []);

    if (initializing) {
        // Uygulama başlangıçta yükleniyor
        return null; // Burada bir "Yükleniyor" ekranı da gösterebilirsiniz
    }

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                {user && userInfo ? (
                    // Kullanıcı giriş yapmışsa
                    <>
                        <Stack.Screen
                            name="ViewTests"
                            options={{ headerShown: false }} // Header'ı özelleştiriyoruz
                        >
                            {() => (
                                <ViewTests
                                    userId={user.uid}
                                    firstName={userInfo.firstName}
                                    lastName={userInfo.lastName}
                                />
                            )}
                        </Stack.Screen>
                    </>
                ) : (
                    // Kullanıcı giriş yapmamışsa
                    <>
                        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
                        <Stack.Screen name="SignUp" component={SignUp} options={{ title: 'Create Account' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}