import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { fetchProductByBarcode } from '../services/openFoodFactsService';
import type { RootStackParamList, OpenFoodFactsResult } from '../types';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

type BarcodeScannerNav = NativeStackNavigationProp<RootStackParamList, 'BarcodeScanner'>;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<BarcodeScannerNav>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<OpenFoodFactsResult | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const result = await fetchProductByBarcode(data);
      if (result) {
        setProduct(result);
        setProductNotFound(false);
      } else {
        setProductNotFound(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not look up product. Please try again.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (product) {
      // Navigate back to AddMeal with the scanned product data
      navigation.navigate('MainTabs' as any, {
        screen: 'AddMeal',
        params: { scannedProduct: product },
      });
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setProduct(null);
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan barcodes and look up nutritional information.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan Barcode</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Not Found */}
        {productNotFound && !loading && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionEmoji}>❓</Text>
            <Text style={styles.permissionTitle}>Product Not Found</Text>
            <Text style={styles.permissionText}>
              We couldn't find nutritional data for this barcode.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.permissionBtnText}>Enter Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setProductNotFound(false); setScanned(false); }}>
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan area */}
        {!product && !productNotFound && (
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {loading && (
              <View style={styles.scanLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.scanLoadingText}>Looking up product...</Text>
              </View>
            )}
          </View>
        )}

        {!product && !productNotFound && !loading && (
          <Text style={styles.instructionText}>Point your camera at a barcode</Text>
        )}

        {/* Product Result */}
        {product && (
          <View style={styles.productCard}>
            {product.imageUrl && (
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
            )}
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
            {product.servingSize && <Text style={styles.servingSize}>Serving: {product.servingSize}</Text>}

            <View style={styles.nutrientGrid}>
              <View style={styles.nutrientItem}>
                <Text style={styles.nutrientValue}>{product.calories}</Text>
                <Text style={styles.nutrientLabel}>kcal</Text>
              </View>
              <View style={styles.nutrientItem}>
                <Text style={[styles.nutrientValue, { color: Colors.secondary }]}>{product.protein}g</Text>
                <Text style={styles.nutrientLabel}>Protein</Text>
              </View>
              <View style={styles.nutrientItem}>
                <Text style={[styles.nutrientValue, { color: Colors.warning }]}>{product.carbs}g</Text>
                <Text style={styles.nutrientLabel}>Carbs</Text>
              </View>
              <View style={styles.nutrientItem}>
                <Text style={[styles.nutrientValue, { color: Colors.success }]}>{product.fat}g</Text>
                <Text style={styles.nutrientLabel}>Fat</Text>
              </View>
            </View>

            {(product.sodium || product.sugars || product.fiber) ? (
              <View style={styles.extraNutrients}>
                {product.sodium ? <Text style={styles.extraText}>🧂 Sodium: {product.sodium}mg</Text> : null}
                {product.sugars ? <Text style={styles.extraText}>🍬 Sugars: {product.sugars}g</Text> : null}
                {product.fiber ? <Text style={styles.extraText}>🌾 Fiber: {product.fiber}g</Text> : null}
              </View>
            ) : null}

            <View style={styles.productActions}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
                <Text style={styles.addBtnText}>Add to Meal ✅</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Scan area
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLoading: { alignItems: 'center' },
  scanLoadingText: { color: '#fff', marginTop: 8, fontSize: 14 },
  instructionText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 16 },

  // Permission
  permissionCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 32,
    margin: 20,
    alignItems: 'center',
  },
  permissionEmoji: { fontSize: 48, marginBottom: 16 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  permissionText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginBottom: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backText: { color: Colors.textSecondary, fontSize: 14, marginTop: 8 },

  // Product card
  productCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    width: width - 40,
    maxHeight: height * 0.55,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  productName: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  productBrand: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  servingSize: { fontSize: 12, color: Colors.primaryLight, textAlign: 'center', marginBottom: 16 },

  nutrientGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutrientItem: { flex: 1, alignItems: 'center' },
  nutrientValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  nutrientLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  extraNutrients: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  extraText: { fontSize: 13, color: Colors.text },

  productActions: { gap: 8 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scanAgainBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  scanAgainText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
