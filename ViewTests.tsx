import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface ViewTestsProps {
    userId: string;
}

const ViewTests = ({ userId }: ViewTestsProps) => {
    const [tests, setTests] = useState<Record<string, number | null>>({});

    useEffect(() => {
        const fetchUserTests = async () => {
            const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', userId));
            if (userDoc.exists()) {
                setTests(userDoc.data().tests || {});
            }
        };

        fetchUserTests();
    }, [userId]);

    return (
        <View style={styles.container}>
            {Object.entries(tests).map(([key, value]) => (
                <Text key={key} style={styles.testItem}>
                    {key}: {value !== null ? value.toString() : 'N/A'}
                </Text>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    testItem: {
        marginVertical: 5,
        fontSize: 16,
    },
});

export default ViewTests;
