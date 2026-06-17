import React, { useState, useEffect, useRef } from 'react';
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
import { getRecentMeals, saveRecentMeal } from '../services/recentMealsService';
import { searchOpenFoodFacts } from '../services/openFoodFactsSearchService';
import { parseFraction } from '../utils/parseFraction';
import { Colors } from '../theme/colors';
import type { Meal, MealType, FoodSearchResult, RootStackParamList, MainTabParamList, Macros } from '../types';

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
const API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

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
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [isFraction, setIsFraction] = useState(false);
  const searchAbortController = useRef<AbortController | null>(null);

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
    const copyMeal = route.params?.copyMeal;
    const dateParam = route.params?.editDate;

    if (editMeal || scannedProduct || copyMeal) {
      setShowManualEntry(true);
    }

    if (editMeal || copyMeal) {
      const mealToLoad = editMeal || copyMeal;
      if (editMeal) {
        setIsEditing(true);
        setEditDate(dateParam || selectedDate);
        setEditMealId(editMeal.id);
      }
      setFoodName(mealToLoad!.name);
      setMealType(mealToLoad!.type);
      setCalories(String(mealToLoad!.calories));
      setProtein(String(mealToLoad!.macros.protein));
      setCarbs(String(mealToLoad!.macros.carbs));
      setFat(String(mealToLoad!.macros.fat));
      setSodium(String(mealToLoad!.macros.sodium || ''));
      setCholesterol(String(mealToLoad!.macros.cholesterol || ''));
      setSugars(String(mealToLoad!.macros.sugars || ''));
      setFiber(String(mealToLoad!.macros.fiber || ''));
      
      if (mealToLoad!.baseNutrition) {
        setBaseNutrition(mealToLoad!.baseNutrition);
        setQuantity(String(mealToLoad!.quantity || mealToLoad!.baseNutrition.quantity));
        setUnit(mealToLoad!.unit || 'g');
      } else {
        setBaseNutrition(null);
        if (copyMeal) {
          setQuantity(String(mealToLoad!.quantity || '100'));
          setUnit(mealToLoad!.unit || 'g');
        }
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
        quantity: 100, // OFF values are per 100g
        calories: c,
        macros: { protein: p, carbs: cb, fat: f, sodium: sod, cholesterol: chol, sugars: sug, fiber: fib }
      });
      // The user may have entered a custom quantity in the scanner screen
      const initialQty = route.params?.enteredQuantity || scannedProduct.servingQuantity || 100;
      setQuantity(String(initialQty));
      setUnit(route.params?.enteredUnit || 'g');
      
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
      if (!route.params?.editMeal && !route.params?.scannedProduct && !route.params?.copyMeal && isEditing) {
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

  // Fetch recent meals when mealType changes
  useEffect(() => {
    async function loadRecent() {
      if (user?.uid) {
        try {
          const meals = await getRecentMeals(user.uid, mealType);
          setRecentMeals(meals.map(m => m.meal));
        } catch (e) {
          console.warn('Failed to load recent meals', e);
        }
      }
    }
    loadRecent();
  }, [mealType, user]);

  // Clear search results when input becomes empty
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchQuery]);

  // Scale nutrition when quantity or unit changes
  useEffect(() => {
    if (baseNutrition) {
      const q = parseFraction(quantity);
      if (q !== null && !isNaN(q) && q >= 0 && baseNutrition.quantity > 0) {
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

  const executeSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    const abortController = new AbortController();
    searchAbortController.current = abortController;
    const signal = abortController.signal;

    setSearching(true);
    try {
      let combined: FoodSearchResult[] = [];

      // Primary: Open Food Facts
      try {
        const offRes = await searchOpenFoodFacts(trimmedQuery, signal);
        if (offRes && offRes.length > 0) {
          combined = offRes;
        }
      } catch (e) {
        // Silently catch OFF errors to allow fallback
      }

      // Fallback: USDA (If OFF fails or returns 0 results)
      if (combined.length === 0) {
        try {
          const usdaResponse = await fetch(`${USDA_API_URL}?query=${encodeURIComponent(trimmedQuery)}&pageSize=10&api_key=${API_KEY}`, { signal });
          if (usdaResponse.ok) {
            const usdaData = await usdaResponse.json();
            const usdaResults: FoodSearchResult[] = (usdaData.foods || []).map((food: any) => ({
              fdcId: String(food.fdcId),
              description: food.description || 'Unknown',
              calories: extractNutrient(food.foodNutrients, 'energy'),
              protein: extractNutrient(food.foodNutrients, 'protein'),
              carbs: extractNutrient(food.foodNutrients, 'carbohydrate'),
              fat: extractNutrient(food.foodNutrients, 'fat'),
            }));
            combined = usdaResults;
          }
        } catch (e) {
          // Silently catch USDA errors
        }
      }
      const uniqueNames = new Set();
      const deduplicated = combined.filter(item => {
        const name = item.description.toLowerCase();
        const key = `${name}-${Math.round(item.calories)}-${Math.round(item.protein)}-${Math.round(item.carbs)}`;
        if (uniqueNames.has(key)) return false;
        uniqueNames.add(key);
        return true;
      });
      setSearchResults(deduplicated);
    } catch (e) {
      Alert.alert('Search Error', 'Could not fetch food data. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const selectFood = (food: FoodSearchResult) => {
    setShowManualEntry(true);
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
      quantity: food.servingQuantity || 100,
      calories: c,
      macros: { protein: p, carbs: cb, fat: f, sodium: sod, cholesterol: chol, sugars: sug, fiber: fib }
    });
    setQuantity(String(food.servingQuantity || 100));
    setUnit('g');
    
    setSearchResults([]);
    setSearchQuery('');
  };

  const selectRecentMeal = (meal: Meal) => {
    setShowManualEntry(true);
    setFoodName(meal.name);
    setMealType(meal.type);
    setCalories(String(meal.calories));
    setProtein(String(meal.macros.protein));
    setCarbs(String(meal.macros.carbs));
    setFat(String(meal.macros.fat));
    setSodium(String(meal.macros.sodium || ''));
    setCholesterol(String(meal.macros.cholesterol || ''));
    setSugars(String(meal.macros.sugars || ''));
    setFiber(String(meal.macros.fiber || ''));
    if (meal.baseNutrition) {
      setBaseNutrition(meal.baseNutrition);
      setQuantity(String(meal.quantity || meal.baseNutrition.quantity));
      setUnit(meal.unit || 'g');
    } else {
      setBaseNutrition(null);
      setQuantity(String(meal.quantity || '100'));
      setUnit(meal.unit || 'g');
    }
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
      quantity: parseFraction(quantity) || 0,
      unit: unit,
      ...(baseNutrition ? {
        baseNutrition,
      } : {})
    };

    try {
      const date = isEditing ? (editDate || selectedDate) : selectedDate;

      // Helper: race a promise against a timeout so nothing hangs forever
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
        ]);

      if (isEditing && route.params?.editMeal) {
        await withTimeout(editMealInLog(user.uid, date, route.params.editMeal, meal), 10000);
        try { await withTimeout(saveRecentMeal(user.uid, meal, meal.type), 5000); } catch (_) {}
        
        try {
          const log = await withTimeout(getDailyLog(user.uid, date), 5000);
          setDailyLog(log);
        } catch (_) {}

        setSaving(false);
        setSuccessMessage(`✅ ${meal.name} has been updated.`);

        setTimeout(() => {
          setSuccessMessage('');
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
        }, 1500);
      } else {
        await withTimeout(addMealToLog(user.uid, date, meal), 10000);
        try { await withTimeout(saveRecentMeal(user.uid, meal, meal.type), 5000); } catch (_) {}
        
        try {
          const log = await withTimeout(getDailyLog(user.uid, date), 5000);
          setDailyLog(log);
        } catch (_) {}

        setSaving(false);
        setSuccessMessage(`✅ ${meal.name} has been logged.`);

        setTimeout(() => {
          setSuccessMessage('');
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
        }, 1500);
      }
    } catch (e) {
      console.error('Error saving meal:', e);
      setSaving(false);
      setSuccessMessage('❌ Error: Could not save meal. Try again.');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Meal 🍽️</Text>

        {/* Meal Type Selector (Moved to Top) */}
        <Text style={[styles.label, { marginTop: 0 }]}>Meal Type</Text>
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

        {/* Quick Add List */}
        {recentMeals.length > 0 && (
          <View style={styles.quickAddContainer}>
            <Text style={styles.label}>Quick Add</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll}>
              {recentMeals.map((meal, index) => (
                <TouchableOpacity key={`${meal.id}-${index}`} style={styles.quickAddCard} onPress={() => selectRecentMeal(meal)}>
                  <Text style={styles.quickAddName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={styles.quickAddCalories}>{meal.calories} cal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Barcode Scanner */}
        <TouchableOpacity
          style={[styles.barcodeBtn, { marginTop: 16 }]}
          onPress={() => navigation.navigate('BarcodeScanner')}
        >
          <Text style={styles.barcodeBtnEmoji}>📷</Text>
          <Text style={styles.barcodeBtnText}>Scan Barcode</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchInput, { flexDirection: 'row', alignItems: 'center', padding: 0 }]}>
            <TextInput
              style={{ flex: 1, padding: 14, color: Colors.text, fontSize: 15 }}
              placeholder="Search Foods..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text.replace(/\n/g, ''))}
              returnKeyType="search"
              onSubmitEditing={() => executeSearch(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 14 }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => executeSearch(searchQuery)}>
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searching && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />}
        {!searching && searchQuery.length > 0 && searchResults.length === 0 && (
          <View style={[styles.resultsCard, { alignItems: 'center', padding: 20 }]}>
            <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center' }}>
              No results found, please use manual entry.
            </Text>
            <TouchableOpacity style={[styles.manualEntryBtn, { marginTop: 16, width: '100%' }]} onPress={() => setShowManualEntry(true)}>
              <Text style={styles.manualEntryBtnText}>➕ Manual Entry</Text>
            </TouchableOpacity>
          </View>
        )}
        {searchResults.length > 0 && (
          <View style={styles.resultsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.resultsTitle, { marginBottom: 0 }]}>Results</Text>
              <TouchableOpacity onPress={() => setSearchResults([])}>
                <Text style={{ fontSize: 13, color: Colors.primary }}>Clear</Text>
              </TouchableOpacity>
            </View>
            {searchResults.map((food) => (
              <TouchableOpacity key={food.fdcId} style={styles.resultItem} onPress={() => selectFood(food)}>
                <Text style={styles.resultName} numberOfLines={1}>{food.description}</Text>
                <View style={styles.resultMacros}>
                  <Text style={styles.resultCalories}>{Math.round(food.calories * 100) / 100} cal</Text>
                  <Text style={styles.resultMacro}>P: {Math.round(food.protein * 100) / 100}g</Text>
                  <Text style={styles.resultMacro}>C: {Math.round(food.carbs * 100) / 100}g</Text>
                  <Text style={styles.resultMacro}>F: {Math.round(food.fat * 100) / 100}g</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Manual Entry */}
        {!showManualEntry && !(searchQuery.length > 0 && searchResults.length === 0 && !searching) ? (
          <TouchableOpacity style={styles.manualEntryBtn} onPress={() => setShowManualEntry(true)}>
            <Text style={styles.manualEntryBtnText}>➕ Manual Entry</Text>
          </TouchableOpacity>
        ) : !showManualEntry ? null : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isEditing ? 'Edit Meal' : (baseNutrition ? 'Add Meal' : 'Manual Entry')}</Text>

          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grilled Chicken Breast"
            placeholderTextColor={Colors.textSecondary}
            value={foodName}
            onChangeText={setFoodName}
          />

          <View style={{ marginTop: 10, backgroundColor: baseNutrition ? Colors.primary + '10' : Colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: baseNutrition ? Colors.primary + '30' : Colors.surface }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.label, { marginTop: 0, color: baseNutrition ? Colors.primary : Colors.textSecondary }]}>Amount Consumed</Text>
              <TouchableOpacity onPress={() => setIsFraction(!isFraction)}>
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '600' }}>
                  {isFraction ? 'Switch to Decimal' : 'Switch to Fraction'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: baseNutrition ? Colors.primary : Colors.inputBorder, backgroundColor: Colors.inputBackground, marginTop: 0 }]}
                keyboardType={isFraction ? 'numbers-and-punctuation' : 'numeric'}
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
                    placeholder="cal"
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

          {/* Save Button */}
          <View style={styles.btnContainer}>
            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes ✅' : 'Add Meal ✅'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
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
                navigation.setParams({ editMeal: undefined, editDate: undefined, scannedProduct: undefined, copyMeal: undefined });
                (navigation as any).navigate('History');
              }}
            >
              <Text style={[styles.saveBtnText, { color: Colors.textSecondary }]}>Cancel Edit ❌</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: Colors.surface, marginTop: 12, borderWidth: 1, borderColor: Colors.inputBorder }]} 
              onPress={() => {
                setShowManualEntry(false);
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
                navigation.setParams({ editMeal: undefined, editDate: undefined, scannedProduct: undefined, copyMeal: undefined });
              }}
            >
              <Text style={[styles.saveBtnText, { color: Colors.textSecondary }]}>Close Manual Entry ❌</Text>
            </TouchableOpacity>
          )}
        </View>
        )}

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
  btnContainer: {
    marginTop: 24,
  },
  successText: {
    color: '#2ecc71',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
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

  // Quick Add & Manual Entry
  quickAddContainer: { marginBottom: 16 },
  quickAddScroll: { marginTop: 8 },
  quickAddCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  quickAddName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  quickAddCalories: { fontSize: 13, color: Colors.primary },
  manualEntryBtn: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  manualEntryBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
