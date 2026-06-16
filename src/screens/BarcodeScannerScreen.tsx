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
  Platform,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { BrowserMultiFormatReader } from '@zxing/library';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const WebScanner = ({ onScan }: { onScan: (data: string) => void }) => {
  const videoRef = React.useRef<any>(null);
  
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let isComponentMounted = true;
    
    if (videoRef.current) {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      codeReader.decodeFromConstraints(constraints, videoRef.current, (result, err) => {
        if (isComponentMounted && result) {
          onScan(result.getText());
        }
      }).catch(e => console.log('Camera error', e));
    }
    
    return () => {
      isComponentMounted = false;
      codeReader.reset();
    };
  }, [onScan]);

  // @ts-ignore - react-native-web supports rendering HTML tags via createElement
  return React.createElement('video', {
    ref: videoRef,
    style: { width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' },
    autoPlay: true,
    muted: true,
    playsInline: true,
  });
};

import { Colors } from '../theme/colors';
import { fetchProductByBarcode } from '../services/openFoodFactsService';
import { parseFraction } from '../utils/parseFraction';
import type { RootStackParamList, OpenFoodFactsResult, Meal, MealType } from '../types';
import { useStore } from '../store/useStore';
import { addMealToLog, getDailyLog } from '../services/firestoreService';
import { saveRecentMeal } from '../services/recentMealsService';

const UNIT_OPTIONS = ['g', 'oz', 'ml', 'cups', 'lbs'];
const UNIT_CONVERSIONS: Record<string, number> = {
  g: 1,
  ml: 1,
  oz: 28.3495,
  lbs: 453.592,
  cups: 240,
};

const { width: windowWidth, height } = Dimensions.get('window');
const width = Math.min(windowWidth, 480);
const SCAN_AREA_SIZE = width * 0.7;

type BarcodeScannerNav = NativeStackNavigationProp<RootStackParamList, 'BarcodeScanner'>;

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<BarcodeScannerNav>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<OpenFoodFactsResult | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [mealType, setMealType] = useState<MealType>('Snack');
  const [saving, setSaving] = useState(false);
  
  const { user, selectedDate, setDailyLog } = useStore();

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const result = await fetchProductByBarcode(data);
      if (result) {
        setProduct(result);
        setQuantity(String(result.servingQuantity || 100));
        setUnit(result.servingUnit || 'g');
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

  const handleEditMeal = () => {
    if (product) {
      // Navigate back to AddMeal with the scanned product data
      navigation.navigate('MainTabs' as any, {
        screen: 'AddMeal',
        params: { scannedProduct: product, enteredQuantity: quantity, enteredUnit: unit, mealType },
      });
    }
  };

  const handleDirectSave = async () => {
    if (!product || !user) return;
    setSaving(true);
    try {
      const q = parseFraction(quantity);
      const safeQ = (q !== null && !isNaN(q) && q >= 0) ? q : 0;
      const multiplier = UNIT_CONVERSIONS[unit] || 1;
      const ratio = (safeQ * multiplier) / 100;
      
      const meal: Meal = {
        id: Date.now().toString(),
        name: product.name,
        calories: Math.round(product.calories * ratio),
        macros: {
          protein: Math.round((product.protein * ratio) * 10) / 10,
          carbs: Math.round((product.carbs * ratio) * 10) / 10,
          fat: Math.round((product.fat * ratio) * 10) / 10,
          sodium: product.sodium ? Math.round(product.sodium * ratio) : 0,
          cholesterol: product.cholesterol ? Math.round(product.cholesterol * ratio) : 0,
          sugars: product.sugars ? Math.round((product.sugars * ratio) * 10) / 10 : 0,
          fiber: product.fiber ? Math.round((product.fiber * ratio) * 10) / 10 : 0,
        },
        time: new Date().toISOString(),
        type: mealType,
        quantity: safeQ,
        unit: unit,
        baseNutrition: {
          quantity: 100, // OFF uses 100g base
          calories: product.calories,
          macros: {
            protein: product.protein,
            carbs: product.carbs,
            fat: product.fat,
            sodium: product.sodium || 0,
            cholesterol: product.cholesterol || 0,
            sugars: product.sugars || 0,
            fiber: product.fiber || 0,
          }
        }
      };

      await addMealToLog(user.uid, selectedDate, meal);
      await saveRecentMeal(user.uid, meal, meal.type);
      
      const log = await getDailyLog(user.uid, selectedDate);
      setDailyLog(log);

      Alert.alert('✅ Meal Added!', `${meal.name} has been logged.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save meal.');
    } finally {
      setSaving(false);
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
      {isFocused && Platform.OS === 'web' ? (
        <WebScanner onScan={(data) => {
          if (!scanned && !loading) {
            handleBarCodeScanned({ type: 'web', data });
          }
        }} />
      ) : isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      ) : null}

      {/* Overlay */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
          <View style={styles.manualEntryContainer}>
            <Text style={styles.instructionText}>Point your camera at a barcode</Text>
            <Text style={styles.orText}>- OR -</Text>
            <View style={styles.manualEntryRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter barcode manually"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={manualBarcode}
                onChangeText={setManualBarcode}
              />
              <TouchableOpacity style={styles.manualBtn} onPress={() => handleBarCodeScanned({ type: 'manual', data: manualBarcode })}>
                <Text style={styles.manualBtnText}>Look Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Product Result */}
        {product && (
          <ScrollView style={styles.productCard} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {product.imageUrl && (
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
            )}
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
            {product.servingSize && <Text style={styles.servingSize}>Serving: {product.servingSize}</Text>}
            
            <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginVertical: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Amount:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    width: 80,
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '700'
                  }}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {UNIT_OPTIONS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: unit === u ? Colors.primary : Colors.surface,
                    }}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: unit === u ? '#fff' : Colors.textSecondary }}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {!product.servingQuantity && (
              <Text style={{ fontSize: 11, color: Colors.warning, textAlign: 'center', marginBottom: 12, paddingHorizontal: 10 }}>
                ⚠️ Default 100g. Please check packaging and edit amount if needed.
              </Text>
            )}

            <View style={styles.nutrientGrid}>
              {(() => {
                const q = parseFraction(quantity);
                const safeQ = (q !== null && !isNaN(q) && q >= 0) ? q : 0;
                const multiplier = UNIT_CONVERSIONS[unit] || 1;
                const ratio = (safeQ * multiplier) / 100;
                return (
                  <>
                    <View style={styles.nutrientItem}>
                      <Text style={styles.nutrientValue}>{(product.calories * ratio).toFixed(1).replace(/\.0$/, '')}</Text>
                      <Text style={styles.nutrientLabel}>cal</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={[styles.nutrientValue, { color: Colors.secondary }]}>{(product.protein * ratio).toFixed(1).replace(/\.0$/, '')}g</Text>
                      <Text style={styles.nutrientLabel}>Protein</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={[styles.nutrientValue, { color: Colors.warning }]}>{(product.carbs * ratio).toFixed(1).replace(/\.0$/, '')}g</Text>
                      <Text style={styles.nutrientLabel}>Carbs</Text>
                    </View>
                    <View style={styles.nutrientItem}>
                      <Text style={[styles.nutrientValue, { color: Colors.success }]}>{(product.fat * ratio).toFixed(1).replace(/\.0$/, '')}g</Text>
                      <Text style={styles.nutrientLabel}>Fat</Text>
                    </View>
                  </>
                );
              })()}
            </View>

            {(product.sodium || product.sugars || product.fiber) ? (
              <View style={styles.extraNutrients}>
                {product.sodium ? <Text style={styles.extraText}>🧂 Sodium: {product.sodium}mg</Text> : null}
                {product.sugars ? <Text style={styles.extraText}>🍬 Sugars: {product.sugars}g</Text> : null}
                {product.fiber ? <Text style={styles.extraText}>🌾 Fiber: {product.fiber}g</Text> : null}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8 }}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: mealType === type ? Colors.primary : Colors.surface,
                  }}
                  onPress={() => setMealType(type)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: mealType === type ? '#fff' : Colors.textSecondary }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.productActions}>
              <TouchableOpacity style={styles.addBtn} onPress={handleDirectSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addBtnText}>Add to Meal ✅</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainBtn} onPress={handleEditMeal}>
                <Text style={styles.scanAgainText}>Edit Meal ✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setProduct(null); setScanned(false); }}>
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
        </View>
      </TouchableWithoutFeedback>
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

  manualEntryContainer: { alignItems: 'center', marginTop: 16 },
  orText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginVertical: 8 },
  manualEntryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manualInput: {
    backgroundColor: Colors.card,
    color: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: 200,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  manualBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  manualBtnText: { color: '#fff', fontWeight: '700' },

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
    paddingHorizontal: 24,
    paddingTop: 24,
    marginHorizontal: 20,
    width: width - 40,
    maxHeight: height * 0.75,
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
