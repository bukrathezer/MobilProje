import { View, Text, StyleSheet, TextInput, ActivityIndicator, Button, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { NavigationProp } from '@react-navigation/native';

interface SignUpProps {
    navigation: NavigationProp<any, any>;
}

const SignUp = ({ navigation }: SignUpProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

    const signUp = async () => {
        setLoading(true);
        try {
            const response = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
            await setDoc(doc(FIRESTORE_DB, 'users', response.user.uid), {
                email: response.user.email,
                firstName,
                lastName,
                role: 'user',
                tests: {
                    IgA: 0,
                    IgM: 0,
                    IgG: 0,
                    IgG1: 0,
                    IgG2: 0,
                    IgG3: 0,
                    IgG4: 0,
                },
            });
            alert('Account created successfully! You can now log in.');
            navigation.goBack(); // Giriş ekranına geri dön
        } catch (error: any) {
            console.log(error);
            alert('Registration failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior="padding">
                <TextInput
                    value={firstName}
                    style={styles.input}
                    placeholder="First Name"
                    autoCapitalize="none"
                    onChangeText={(text) => setFirstName(text)}
                />
                <TextInput
                    value={lastName}
                    style={styles.input}
                    placeholder="Last Name"
                    autoCapitalize="none"
                    onChangeText={(text) => setLastName(text)}
                />
                <TextInput
                    value={email}
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    onChangeText={(text) => setEmail(text)}
                />
                <TextInput
                    secureTextEntry
                    value={password}
                    style={styles.input}
                    placeholder="Password"
                    autoCapitalize="none"
                    onChangeText={(text) => setPassword(text)}
                />
                {loading ? (
                    <ActivityIndicator size="large" color="blue" />
                ) : (
                    <Button title="Create Account" onPress={signUp} />
                )}
            </KeyboardAvoidingView>
        </View>
    );
};

export default SignUp;

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        flex: 1,
        justifyContent: 'center',
    },
    input: {
        marginVertical: 4,
        height: 50,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff',
    },
});