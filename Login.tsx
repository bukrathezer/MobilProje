import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
            console.log("Login Successful!", userCredential.user);
            Alert.alert("Login Successful!", "Welcome to the app!");
        } catch (error) {
            if (error instanceof FirebaseError) {
                Alert.alert("Login Error", error.message);
            } else {
                Alert.alert("Login Error", "An unknown error occurred.");
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Login</Text>
            <TextInput
                placeholder="Email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput
                placeholder="Password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="Login" onPress={handleLogin} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
});

export default Login;
