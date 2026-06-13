import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useStore } from '../store/useStore';
import { addWater, updateWeight, getDailyLog } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import CircularProgress from '../components/CircularProgress';
import MacroCard from '../components/MacroCard';
import type { MainTabParamList, MascotMood } from '../types';

const { width } = Dimensions.get('window');

// Mascot image maps
const maliImages: Record<string, any> = {
  sleeping: require('../../assets/mascots/mali_sleepy.png'),
  happy: require('../../assets/mascots/mali_happy.png'),
  eating: require('../../assets/mascots/mali_happy.png'),
  drinking: require('../../assets/mascots/mali_happy.png'),
  celebrating: require('../../assets/mascots/mali_celebrating.png'),
  encouraging: require('../../assets/mascots/mali_happy.png'),
};

const satoImages: Record<string, any> = {
  sleeping: require('../../assets/mascots/sato_encouraging.png'),
  happy: require('../../assets/mascots/sato_happy.png'),
  eating: require('../../assets/mascots/sato_happy.png'),
  drinking: require('../../assets/mascots/sato_drinking.png'),
  celebrating: require('../../assets/mascots/sato_happy.png'),
  encouraging: require('../../assets/mascots/sato_encouraging.png'),
};

const mascotMessages: Record<MascotMood, string> = {
  sleeping: "Good morning! 🌅 Let's start tracking today!",
  happy: "You're doing great! Keep it up! 💪",
  eating: "Yum! Great meal choices today! 🍽️",
  drinking: "Stay hydrated! Water is life! 💧",
  celebrating: "🎉 ALL GOALS MET! You're amazing!",
  encouraging: "You got this! Every step counts! 🐾",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

type DashboardNav = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { user, dailyLog, setDailyLog, getMascotState } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);

  const mascotState = getMascotState();
  const goals = user?.goals ?? { calories: 2000, protein: 150, carbs: 250, fat: 65, water: 8 };
  const totals = dailyLog?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, waterIntake: 0 };

  const calProgress = goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1) : 0;

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const today = new Date().toISOString().split('T')[0];
    const log = await getDailyLog(user.uid, today);
    setDailyLog(log);
    setRefreshing(false);
  }, [user]);

  const handleAddWater = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    await addWater(user.uid, today, 1);
    const log = await getDailyLog(user.uid, today);
    setDailyLog(log);
  };

  const handleLogWeight = () => {
    Alert.prompt
      ? Alert.prompt('Log Weight', 'Enter your weight (lbs):', async (text) => {
          const weight = parseFloat(text);
          if (!isNaN(weight) && user) {
            const today = new Date().toISOString().split('T')[0];
            await updateWeight(user.uid, today, weight);
            const log = await getDailyLog(user.uid, today);
            setDailyLog(log);
          }
        })
      : setShowWeightModal(true);
  };

  const submitWeight = async () => {
    const weight = parseFloat(weightInput);
    if (!isNaN(weight) && user) {
      const today = new Date().toISOString().split('T')[0];
      await updateWeight(user.uid, today, weight);
      const log = await getDailyLog(user.uid, today);
      setDailyLog(log);
    }
    setShowWeightModal(false);
    setWeightInput('');
  };

  const waterGlasses = totals.waterIntake || 0;
  const waterGoal = goals.water || 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {user?.displayName?.split(' ')[0] ?? 'Friend'} 👋</Text>
          <Text style={styles.date}>{getFormattedDate()}</Text>
        </View>
      </View>

      {/* Mascot Area */}
      <View style={styles.mascotCard}>
        <View style={styles.mascotRow}>
          <View style={styles.mascotContainer}>
            <Image source={maliImages[mascotState]} style={styles.mascotImage} resizeMode="contain" />
            <Text style={styles.mascotName}>Mali</Text>
          </View>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>{mascotMessages[mascotState]}</Text>
            <View style={styles.speechArrowLeft} />
          </View>
          <View style={styles.mascotContainer}>
            <Image source={satoImages[mascotState]} style={styles.mascotImage} resizeMode="contain" />
            <Text style={styles.mascotName}>Sato</Text>
          </View>
        </View>
      </View>

      {/* Calorie Ring */}
      <View style={styles.calorieCard}>
        <Text style={styles.sectionTitle}>Calories</Text>
        <View style={styles.calorieCenter}>
          <CircularProgress
            size={160}
            strokeWidth={14}
            progress={calProgress}
            color={Colors.primary}
            backgroundColor={Colors.surface}
          >
            <Text style={styles.calNumber}>{Math.round(totals.calories)}</Text>
            <Text style={styles.calLabel}>of {goals.calories}</Text>
          </CircularProgress>
        </View>
      </View>

      {/* Macros */}
      <Text style={styles.sectionTitle}>Macros</Text>
      <View style={styles.macroRow}>
        <MacroCard icon="🥩" label="Protein" current={totals.protein} goal={goals.protein} color={Colors.secondary} />
        <MacroCard icon="🍞" label="Carbs" current={totals.carbs} goal={goals.carbs} color={Colors.warning} />
        <MacroCard icon="🥑" label="Fat" current={totals.fat} goal={goals.fat} color={Colors.success} />
      </View>

      {/* Water Tracker */}
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={styles.sectionTitle}>Water 💧</Text>
          <Text style={styles.waterCount}>{waterGlasses}/{waterGoal} glasses</Text>
        </View>
        <View style={styles.waterRow}>
          {Array.from({ length: waterGoal }).map((_, i) => (
            <Text key={i} style={[styles.waterGlass, i < waterGlasses && styles.waterGlassFilled]}>
              {i < waterGlasses ? '🥛' : '🫙'}
            </Text>
          ))}
        </View>
        <TouchableOpacity style={styles.addWaterBtn} onPress={handleAddWater}>
          <Text style={styles.addWaterText}>+ Add Glass</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
          onPress={() => navigation.navigate('AddMeal')}
        >
          <Text style={styles.actionEmoji}>🍽️</Text>
          <Text style={styles.actionText}>Add Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.surface }]}
          onPress={handleLogWeight}
        >
          <Text style={styles.actionEmoji}>⚖️</Text>
          <Text style={styles.actionText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      {/* Weight modal (Android fallback) */}
      {showWeightModal && (
        <View style={styles.weightModal}>
          <Text style={styles.weightModalTitle}>Log Weight</Text>
          <TextInput
            style={styles.weightInput}
            placeholder="Weight (lbs)"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            value={weightInput}
            onChangeText={setWeightInput}
          />
          <View style={styles.weightModalBtns}>
            <TouchableOpacity onPress={() => setShowWeightModal(false)}>
              <Text style={styles.weightCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submitWeight}>
              <Text style={styles.weightSubmit}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Current Weight Display */}
      {dailyLog?.currentWeight && (
        <View style={styles.weightDisplay}>
          <Text style={styles.weightLabel}>Today's Weight</Text>
          <Text style={styles.weightValue}>{dailyLog.currentWeight} lbs</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.text },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  // Mascot
  mascotCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  mascotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mascotContainer: { alignItems: 'center', width: 90 },
  mascotImage: { width: 80, height: 80, borderRadius: 40 },
  mascotName: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.cardLight,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 8,
    position: 'relative',
  },
  speechText: { fontSize: 13, color: Colors.text, textAlign: 'center', lineHeight: 18 },
  speechArrowLeft: {
    position: 'absolute',
    left: -6,
    top: '40%',
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: Colors.cardLight,
  },

  // Calorie Ring
  calorieCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  calorieCenter: { marginTop: 12 },
  calNumber: { fontSize: 32, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  calLabel: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },

  // Macros
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },

  // Water
  waterCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterCount: { fontSize: 14, color: Colors.water, fontWeight: '600' },
  waterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  waterGlass: { fontSize: 24, opacity: 0.3 },
  waterGlassFilled: { opacity: 1 },
  addWaterBtn: {
    backgroundColor: Colors.water + '20',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addWaterText: { color: Colors.water, fontWeight: '700', fontSize: 14 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 28, marginBottom: 4 },
  actionText: { color: Colors.text, fontWeight: '700', fontSize: 14 },

  // Weight Modal
  weightModal: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  weightModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  weightInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  weightModalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  weightCancel: { color: Colors.textSecondary, fontSize: 16 },
  weightSubmit: { color: Colors.primary, fontSize: 16, fontWeight: '700' },

  // Weight Display
  weightDisplay: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  weightLabel: { fontSize: 13, color: Colors.textSecondary },
  weightValue: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 4 },
});
