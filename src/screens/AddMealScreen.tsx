import React, { useState } from 'react';
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
import { useStore } from '../store/useStore';
import { addMealToLog, getDailyLog } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import type { Meal, MealType, USDAFoodResult } from '../types';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const API_KEY = 'DEMO_KEY';

function extractNutrient(nutrients: any[], nutrientName: string): number {
  const found = nutrients?.find((n: any) =>
    n.nutrientName?.toLowerCase().includes(nutrientName.toLowerCase())
  );
  return found ? Math.round(found.value * 10) / 10 : 0;
}

export default function AddMealScreen() {
  const { user, setDailyLog } = useStore();
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
  const [mealType, setMealType] = useState<MealType>('Lunch');

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
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFat(String(food.fat));
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
      id: Date.now().toString(),
      name: foodName.trim(),
      calories: parseFloat(calories) || 0,
      macros: {
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
      },
      time: new Date().toISOString(),
      type: mealType,
    };

    try {
      const today = new Date().toISOString().split('T')[0];
      await addMealToLog(user.uid, today, meal);
      const log = await getDailyLog(user.uid, today);
      setDailyLog(log);

      // Reset form
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      Alert.alert('✅ Meal Added!', `${meal.name} has been logged.`);
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
          <Text style={styles.formTitle}>Manual Entry</Text>

          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grilled Chicken Breast"
            placeholderTextColor={Colors.textSecondary}
            value={foodName}
            onChangeText={setFoodName}
          />

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
              <Text style={styles.saveBtnText}>Add Meal ✅</Text>
            )}
          </TouchableOpacity>
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

  // Save
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
