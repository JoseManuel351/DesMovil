import { useState, useEffect } from "react";
import { Text, View, StyleSheet, Button, FlatList, TouchableOpacity } from "react-native";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { connectDb } from "../src/database";
import { ScannedCode } from "../src/models";
import axios from "axios";

// ⚠️ Usa tu IP local real si estás en dispositivo físico
const WEB_SERVICE_URL = 'http://localhost:3000/codigos';

export default () => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedCodes, setScannedCodes] = useState<ScannedCode[]>([]);

    useEffect(() => {
        async function getCurrentLocation() {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        }

        async function retrieveRemoteData() {
            try {
                const response = await axios.get(WEB_SERVICE_URL, {
                    headers: { Accept: "application/json" }
                });
                setScannedCodes(response.data);
            } catch (error) {
                console.error("Error al obtener códigos del Web Service:", error);
            }
        }

        getCurrentLocation();
        retrieveRemoteData();
    }, []);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View>
                <Text>Camera permission is required to use this app.</Text>
                <Button title="Grant Permission" onPress={requestPermission} />
            </View>
        );
    }

    let text = 'Waiting..';
    if (errorMsg) {
        text = errorMsg;
    } else if (location) {
        text = JSON.stringify(location);
    }

    const onBarcodeScanned = async (result: BarcodeScanningResult) => {
        alert(result.data);

        const db = await connectDb();
        await db.insertarCodigo(result.data, result.type);

        try {
            await axios.post(WEB_SERVICE_URL, {
                id: Date.now().toString(),
                data: result.data,
                type: result.type || "qr"
            });
        } catch (error) {
            console.error("Error al enviar al Web Service:", error);
        }

        try {
            const response = await axios.get(WEB_SERVICE_URL);
            setScannedCodes(response.data);
        } catch (error) {
            console.error("Error al actualizar lista del Web Service:", error);
        }
    };

    const ScannedItem = ({ item }: { item: ScannedCode }) => {
        const onCopyPress = () => {
            Clipboard.setStringAsync(item.data);
        };

        const onDeletePress = async () => {
            try {
                await axios.delete(`${WEB_SERVICE_URL}/${item.id}`);
                const response = await axios.get(WEB_SERVICE_URL);
                setScannedCodes(response.data);
            } catch (error) {
                console.error("Error al eliminar el código:", error);
            }
        };

        return (
            <View style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.data}</Text>

                <View style={{ flexDirection: "row", marginTop: 5 }}>
                    <TouchableOpacity onPress={onCopyPress} style={styles.copyButton}>
                        <Text style={styles.copyText}>Copiar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDeletePress} style={styles.deleteButton}>
                        <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.locationText}>GPS: {text}</Text>

            <CameraView
                facing={facing}
                style={styles.CameraView}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', "code128", "datamatrix", "aztec"]
                }}
                onBarcodeScanned={onBarcodeScanned}
            />

            <FlatList
                data={scannedCodes}
                keyExtractor={(item) => item.id}
                renderItem={ScannedItem}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    locationText: {
        marginBottom: 10,
    },
    CameraView: {
        width: "100%",
        minHeight: 240,
        marginBottom: 20,
    },
    itemContainer: {
        padding: 10,
        backgroundColor: "#f0f0f0",
        marginBottom: 10,
        borderRadius: 8,
    },
    itemText: {
        fontSize: 16,
    },
    copyButton: {
        padding: 5,
        backgroundColor: "#007bff",
        borderRadius: 4,
        alignItems: "center",
    },
    copyText: {
        color: "#fff",
    },
    deleteButton: {
        marginLeft: 10,
        padding: 5,
        backgroundColor: "#dc3545",
        borderRadius: 4,
        alignItems: "center",
    },
    deleteText: {
        color: "#fff",
    },
});
