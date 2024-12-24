import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Test değerlerinin türünü tanımlayın
interface Tests {
    IgA: number | null;
    IgM: number | null;
    IgG: number | null;
    IgG1: number | null;
    IgG2: number | null;
    IgG3: number | null;
    IgG4: number | null;
}

interface EditTestsProps {
    route: {
        params: {
            userId: string;
        };
    };
    navigation: any;
}

const EditTests = ({ route, navigation }: EditTestsProps) => {
    const { userId } = route.params;

    const [tests, setTests] = useState<Tests>({
        IgA: null,
        IgM: null,
        IgG: null,
        IgG1: null,
        IgG2: null,
        IgG3: null,
        IgG4: null,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserTests = async () => {
            const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setTests(userData.tests || {});
                setLoading(false);
            }
        };

        fetchUserTests();
    }, [userId]);

    const handleSave = async () => {
        try {
            await updateDoc(doc(FIRESTORE_DB, 'users', userId), { tests });
            alert('Tests updated successfully.');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating tests:', error);
        }
    };

    if (loading) {
        return <Text>Loading...</Text>;
    }

    return (
        <View style={styles.container}>
            {Object.keys(tests).map((key) => (
                <View key={key} style={styles.inputContainer}>
                    <Text>{key}</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={tests[key as keyof Tests]?.toString() || ''} // key as keyof Tests ile hata çözülür
                        onChangeText={(value) =>
                            setTests((prev) => ({
                                ...prev,
                                [key as keyof Tests]: parseFloat(value) || null, // key as keyof Tests kullanımı burada da gerekli
                            }))
                        }
                    />
                </View>
            ))}
            <Button title="Save" onPress={handleSave} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    inputContainer: {
        marginVertical: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 5,
        borderRadius: 5,
    },
});

export default EditTests;