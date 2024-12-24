import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NavigationProp } from '@react-navigation/native';

interface LoginProps {
    navigation: NavigationProp<any, any>;
}

const Login = ({ navigation }: LoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
            console.log("Login Successful!");
        } catch (error: any) {
            console.error("Login Error:", error);
            alert("Login Error: " + error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Welcome</Text>
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
            <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account?</Text>
                <Button
                    title="Create Account"
                    onPress={() => navigation.navigate('SignUp')}
                    color="#841584"
                />
            </View>
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
    signupContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    signupText: {
        marginBottom: 10,
        fontSize: 16,
    },
});

export default Login;