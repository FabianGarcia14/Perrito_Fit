import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { updateGoals, logoutUser } from '../services/authService';
import { Colors } from '../theme/colors';

export default function SettingsScreen() {
  const { user, setUser } = useStore();

  const [calories, setCalories] = useState(String(user?.goals.calories ?? 2000));
  const [protein, setProtein] = useState(String(user?.goals.protein ?? 150));
  const [carbs, setCarbs] = useState(String(user?.goals.carbs ?? 250));
  const [fat, setFat] = useState(String(user?.goals.fat ?? 65));
  const [water, setWater] = useState(String(user?.goals.water ?? 8));
  const [sodium, setSodium] = useState(String(user?.goals.sodium ?? 2300));
  const [cholesterol, setCholesterol] = useState(String(user?.goals.cholesterol ?? 300));
  const [sugars, setSugars] = useState(String(user?.goals.sugars ?? 50));
  const [fiber, setFiber] = useState(String(user?.goals.fiber ?? 28));
  const [saving, setSaving] = useState(false);

  const handleSaveGoals = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const newGoals = {
        calories: parseInt(calories) || 2000,
        protein: parseInt(protein) || 150,
        carbs: parseInt(carbs) || 250,
        fat: parseInt(fat) || 65,
        water: parseInt(water) || 8,
        sodium: parseInt(sodium) || 2300,
        cholesterol: parseInt(cholesterol) || 300,
        sugars: parseInt(sugars) || 50,
        fiber: parseInt(fiber) || 28,
      };
      await updateGoals(user.uid, newGoals);
      setUser({ ...user, goals: newGoals });
      Alert.alert('✅ Saved!', 'Your goals have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save goals. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings ⚙️</Text>

      {/* User Info */}
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
      </View>

      {/* Goals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Goals</Text>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🔥 Calories (kcal)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🥩 Protein (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍞 Carbs (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🥑 Fat (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={fat}
            onChangeText={setFat}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>💧 Water (oz)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={water}
            onChangeText={setWater}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🧂 Sodium (mg)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={sodium}
            onChangeText={setSodium}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍳 Cholesterol (mg)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={cholesterol}
            onChangeText={setCholesterol}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🍬 Sugars (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={sugars}
            onChangeText={setSugars}
          />
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>🌾 Fiber (g)</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={fiber}
            onChangeText={setFiber}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoals} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Goals</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>🐕 Perrito Fit</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appMascots}>Mali 🐕‍🦺 & Henni 🐕</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 20 },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  // User Info
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  userInfo: { marginLeft: 16 },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  goalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    width: 100,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },

  // Save
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Sign Out
  signOutBtn: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: { color: Colors.error, fontSize: 16, fontWeight: '700' },

  // App Info
  appInfo: { alignItems: 'center', paddingVertical: 20 },
  appName: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  appVersion: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  appMascots: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
});
