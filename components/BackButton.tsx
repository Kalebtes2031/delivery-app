import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const BackButton = ({ title }: { title: string }) => {
    const router = useRouter()
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                hitSlop={10}
            >
                <Ionicons name="arrow-back" size={18} color="#6750A4" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 24 }} />
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "white",
    },
    backButton: {
        borderWidth: 1,
        borderColor: "#6750A4",
        borderRadius: 999,
        padding: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#6750A4",
        textTransform: "uppercase",
    },
})
export default BackButton