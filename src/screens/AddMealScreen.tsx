import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';
import { getLocalDateString } from '../utils/dateUtils';
import { addMealToLog, getDailyLog, editMealInLog } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import type { Meal, MealType, USDAFoodResult, RootStackParamList, MainTabParamList, Macros } from '../types';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const UNIT_OPTIONS = ['g', 'oz', 'ml', 'cups', 'lbs'];
const UNIT_CONVERSIONS: Record<string, number> = {
  g: 1,
  ml: 1,
  oz: 28.3495,
  lbs: 453.592,
  cups: 240, // Approximate for liquids/solids
};

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const API_KEY = 'DEMO_KEY';

function extractNutrient(nutrients: any[], nutrientName: string): number {
  const found = nutrients?.find((n: any) =>
    n.nutrientName?.toLowerCase().includes(nutrientName.toLowerCase())
  );
  return found ? Math.round(found.value * 10) / 10 : 0;
}

export default function AddMealScreen() {
  const { user, setDailyLog, selectedDate } = useStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'AddMeal'>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<USDAFoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sodium, setSodium] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [sugars, setSugars] = useState('');
  const [fiber, setFiber] = useState('');
  const [mealType, setMealType] = useState<MealType>('Lunch');

  // Scaling state
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [baseNutrition, setBaseNutrition] = useState<{ quantity: number; calories: number; macros: Macros } | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editMealId, setEditMealId] = useState<string | null>(null);

  // Handle scanned barcode product data or edit meal
  useEffect(() => {
    const scannedProduct = route.params?.scannedProduct;
    const editMeal = route.params?.editMeal;
    const dateParam = route.params?.editDate;

    if (editMeal) {
      setIsEditing(true);
      setEditDate(dateParam || selectedDate);
      setEditMealId(editMeal.id);
      setFoodName(editMeal.name);
      setMealType(editMeal.type);
      setCalories(String(editMeal.calories));
      setProtein(String(editMeal.macros.protein));
      setCarbs(String(editMeal.macros.carbs));
      setFat(String(editMeal.macros.fat));
      setSodium(String(editMeal.macros.sodium || ''));
      setCholesterol(String(editMeal.macros.cholesterol || ''));
      setSugars(String(editMeal.macros.sugars || ''));
      setFiber(String(editMeal.macros.fiber || ''));
      
      if (editMeal.baseNutrition) {
        setBaseNutrition(editMeal.baseNutrition);
        setQuantity(String(editMeal.quantity || editMeal.baseNutrition.quantity));
        setUnit(editMeal.unit || 'g');
      } else {
        setBaseNutrition(null);
      }
    } else if (scannedProduct) {
      setFoodName(scannedProduct.name + (scannedProduct.brand ? ` (${scannedProduct.brand})` : ''));
      const c = scannedProduct.calories;
      const p = scannedProduct.protein;
      const cb = scannedProduct.carbs;
      const f = scannedProduct.fat;
      const sod = scannedProduct.sodium || 0;
      const chol = scannedProduct.cholesterol || 0;
      const sug = scannedProduct.sugars || 0;
      const fib = scannedProduct.fiber || 0;

      setBaseNutrition({
        quantity: 100,
        calories: c,
        macros: { protein: p, carbs: cb, fat: f, sodium: sod, cholesterol: chol, sugars: sug, fiber: fib }
      });
      setQuantity('100');
      setUnit('g');
      
      setCalories(String(c));
      setProtein(String(p));
      setCarbs(String(cb));
      setFat(String(f));
      if (sod) setSodium(String(sod));
      if (chol) setCholesterol(String(chol));
      if (sug) setSugars(String(sug));
      if (fib) setFiber(String(fib));
    }
  }, [route.params, selectedDate]);

  // Listen to focus events to clear the editing state if no params are present
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!route.params?.editMeal && !route.params?.scannedProduct && isEditing) {
        setIsEditing(false);
        setEditMealId(null);
        setEditDate(null);
        setFoodName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setSodium('');
        setCholesterol('');
        setSugars('');
        setFiber('');
        setQuantity('100');
        setUnit('g');
        setBaseNutrition(null);
      }
    });
    return unsubscribe;
  }, [navigation, route.params, isEditing]);

  // Scale nutrition when quantity or unit changes
  useEffect(() => {
    if (baseNutrition) {
      const q = parseFloat(quantity);
      if (!isNaN(q) && q >= 0 && baseNutrition.quantity > 0) {
        const multiplier = UNIT_CONVERSIONS[unit] || 1;
        const quantityInGrams = q * multiplier;
        const ratio = quantityInGrams / baseNutrition.quantity;
        
        setCalories((baseNutrition.calories * ratio).toFixed(1).replace(/\.0$/, ''));
        setProtein((baseNutrition.macros.protein * ratio).toFixed(1).replace(/\.0$/, ''));
        setCarbs((baseNutrition.macros.carbs * ratio).toFixed(1).replace(/\.0$/, ''));
        setFat((baseNutrition.macros.fat * ratio).toFixed(1).replace(/\.0$/, ''));
        
        if (baseNutrition.macros.sodium !== undefined) setSodium((baseNutrition.macros.sodium * ratio).toFixed(1).replace(/\.0$/, ''));
        if (baseNutrition.macros.cholesterol !== undefined) setCholesterol((baseNutrition.macros.cholesterol * ratio).toFixed(1).replace(/\.0$/, ''));
        if (baseNutrition.macros.sugars !== undefined) setSugars((baseNutrition.macros.sugars * ratio).toFixed(1).replace(/\.0$/, ''));
        if (baseNutrition.macros.fiber !== undefined) setFiber((baseNutrition.macros.fiber * ratio).toFixed(1).replace(/\.0$/, ''));
      }
    }
  }, [quantity, unit, baseNutrition]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${USDA_API_URL}?query=${encodeURIComponent(searchQuery)}&pageSize=10&api_key=${API_KEY}`
      );
      const data = await res.json();
      const results: USDAFoodResult[] = (data.foods || []).map((food: any) => ({
        fdcId: food.fdcId,
        description: food.description || 'Unknown',
        calories: extractNutrient(food.foodNutrients, 'energy'),
        protein: extractNutrient(food.foodNutrients, 'protein'),
        carbs: extractNutrient(food.foodNutrients, 'carbohydrate'),
        fat: extractNutrient(food.foodNutrients, 'fat'),
      }));
      setSearchResults(results);
    } catch (e) {
      Alert.alert('Search Error', 'Could not fetch food data. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const selectFood = (food: USDAFoodResult) => {
    setFoodName(food.description);
    
    const c = food.calories;
    const p = food.protein;
    const cb = food.carbs;
    const f = food.fat;
    const sod = food.sodium || 0;
    const chol = food.cholesterol || 0;
    const sug = food.sugars || 0;
    const fib = food.fiber || 0;

    setBaseNutrition({
      quantity: 100, // USDA default
      calories: c,
      macros: { protein: p, carbs: cb, fat: f, sodium: sod, cholesterol: chol, sugars: sug, fiber: fib }
    });
    setQuantity('100');
    setUnit('g');
    
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('Missing Info', 'Please enter a food name.');
      return;
    }
    if (!user) return;

    setSaving(true);
    const meal: Meal = {
      id: isEditing && editMealId ? editMealId : Date.now().toString(),
      name: foodName.trim(),
      calories: parseFloat(calories) || 0,
      macros: {
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        sodium: parseFloat(sodium) || 0,
        cholesterol: parseFloat(cholesterol) || 0,
        sugars: parseFloat(sugars) || 0,
        fiber: parseFloat(fiber) || 0,
      },
      time: new Date().toISOString(),
      type: mealType,
      quantity: parseFloat(quantity) || 0,
      unit: unit,
      ...(baseNutrition ? {
        baseNutrition,
      } : {})
    };

    try {
      const date = isEditing ? (editDate || selectedDate) : selectedDate;
      if (isEditing && route.params?.editMeal) {
        await editMealInLog(user.uid, date, route.params.editMeal, meal);
        Alert.alert('✅ Meal Updated!', `${meal.name} has been updated.`);
        
        // Reset and clear editing state
        navigation.setParams({ editMeal: undefined, editDate: undefined, scannedProduct: undefined });
        setIsEditing(false);
        setEditMealId(null);
        setEditDate(null);
        setFoodName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setSodium('');
        setCholesterol('');
        setSugars('');
        setFiber('');
        setQuantity('100');
        setUnit('g');
        setBaseNutrition(null);
        
        (navigation as any).navigate('History');
      } else {
        await addMealToLog(user.uid, date, meal);
        Alert.alert('✅ Meal Added!', `${meal.name} has been logged.`);
        
        // Reset form
        setFoodName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setSodium('');
        setCholesterol('');
        setSugars('');
        setFiber('');
        setQuantity('100');
        setUnit('g');
        setBaseNutrition(null);
      }
      
      const log = await getDailyLog(user.uid, date);
      setDailyLog(log);
    } catch (e) {
      Alert.alert('Error', 'Could not save meal. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Meal 🍽️</Text>

        {/* Barcode Scanner */}
        <TouchableOpacity
          style={styles.barcodeBtn}
          onPress={() => navigation.navigate('BarcodeScanner')}
        >
          <Text style={styles.barcodeBtnEmoji}>📷</Text>
          <Text style={styles.barcodeBtnText}>Scan Barcode</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search USDA Food Database..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searching && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />}
        {searchResults.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Results</Text>
            {searchResults.map((food) => (
              <TouchableOpacity key={food.fdcId} style={styles.resultItem} onPress={() => selectFood(food)}>
                <Text style={styles.resultName} numberOfLines={1}>{food.description}</Text>
                <View style={styles.resultMacros}>
                  <Text style={styles.resultCalories}>{food.calories} kcal</Text>
                  <Text style={styles.resultMacro}>P: {food.protein}g</Text>
                  <Text style={styles.resultMacro}>C: {food.carbs}g</Text>
                  <Text style={styles.resultMacro}>F: {food.fat}g</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Manual Entry */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isEditing ? 'Edit Meal' : 'Manual Entry'}</Text>

          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grilled Chicken Breast"
            placeholderTextColor={Colors.textSecondary}
            value={foodName}
            onChangeText={setFoodName}
          />

          <View style={{ marginTop: 10, backgroundColor: baseNutrition ? Colors.primary + '10' : Colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: baseNutrition ? Colors.primary + '30' : Colors.surface }}>
            <Text style={[styles.label, { marginTop: 0, color: baseNutrition ? Colors.primary : Colors.textSecondary }]}>Amount Consumed</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: baseNutrition ? Colors.primary : Colors.inputBorder, backgroundColor: Colors.inputBackground, marginTop: 0 }]}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder={baseNutrition ? `e.g. ${baseNutrition.quantity}` : "e.g. 100"}
              />
            </View>

            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {baseNutrition && (
              <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 10 }}>
                Macros will automatically scale based on {baseNutrition.quantity}g reference.
              </Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.input}
                placeholder="kcal"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="g"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="g"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="g"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={fat}
                onChangeText={setFat}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Sodium (mg)</Text>
              <TextInput
                style={styles.input}
                placeholder="mg"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={sodium}
                onChangeText={setSodium}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Cholesterol (mg)</Text>
              <TextInput
                style={styles.input}
                placeholder="mg"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={cholesterol}
                onChangeText={setCholesterol}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Sugars (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="g"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={sugars}
                onChangeText={setSugars}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Fiber (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="g"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
                value={fiber}
                onChangeText={setFiber}
              />
            </View>
          </View>

          {/* Meal Type Selector */}
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes ✅' : 'Add Meal ✅'}</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: Colors.surface, marginTop: 12, borderWidth: 1, borderColor: Colors.inputBorder }]} 
              onPress={() => {
                setIsEditing(false);
                setEditMealId(null);
                setEditDate(null);
                setFoodName('');
                setCalories('');
                setProtein('');
                setCarbs('');
                setFat('');
                setSodium('');
                setCholesterol('');
                setSugars('');
                setFiber('');
                setQuantity('100');
                setUnit('g');
                setBaseNutrition(null);
                navigation.setParams({ editMeal: undefined, editDate: undefined, scannedProduct: undefined });
                (navigation as any).navigate('History');
              }}
            >
              <Text style={[styles.saveBtnText, { color: Colors.textSecondary }]}>Cancel Edit ❌</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 20 },

  // Search
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { fontSize: 20 },

  // Results
  resultsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  resultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  resultMacros: { flexDirection: 'row', gap: 12 },
  resultCalories: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  resultMacro: { fontSize: 12, color: Colors.textSecondary },

  // Form
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },

  // Meal Type
  mealTypeRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  mealTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  mealTypeBtnActive: { backgroundColor: Colors.primary },
  mealTypeText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  mealTypeTextActive: { color: Colors.text },

  // Unit Type
  unitRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  unitBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  unitBtnTextActive: { color: '#fff' },

  // Save
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Barcode
  barcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  barcodeBtnEmoji: { fontSize: 20 },
  barcodeBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
