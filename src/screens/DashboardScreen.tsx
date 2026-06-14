import React, { useEffect, useCallback, useState } from 'react';
import { getLocalDateString, shiftDate, formatDateDisplay, isToday } from '../utils/dateUtils';
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
import { addWater, updateWeight, updateMedications, getDailyLog, getMostRecentWeight } from '../services/firestoreService';
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

const henniImages: Record<string, any> = {
  sleeping: require('../../assets/mascots/henni_encouraging.png'),
  happy: require('../../assets/mascots/henni_happy.png'),
  eating: require('../../assets/mascots/henni_happy.png'),
  drinking: require('../../assets/mascots/henni_drinking.png'),
  celebrating: require('../../assets/mascots/henni_happy.png'),
  encouraging: require('../../assets/mascots/henni_encouraging.png'),
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



type DashboardNav = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { user, dailyLog, setDailyLog, getMascotState, selectedDate, setSelectedDate, isLoading, setLoading } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [waterInput, setWaterInput] = useState('');
  const [recentWeight, setRecentWeight] = useState<{ weight: number; date: string } | null>(null);

  const goToPreviousDay = () => setSelectedDate(shiftDate(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(shiftDate(selectedDate, 1));
  const goToToday = () => setSelectedDate(getLocalDateString());

  useEffect(() => {
    const loadDateData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const log = await getDailyLog(user.uid, selectedDate);
        setDailyLog(log);
      } catch (error) {
        console.error('Error loading daily log:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDateData();
  }, [selectedDate, user]);

  useEffect(() => {
    if (user && (!dailyLog || !dailyLog.currentWeight)) {
      getMostRecentWeight(user.uid, selectedDate).then(setRecentWeight);
    } else {
      setRecentWeight(null);
    }
  }, [user, dailyLog?.currentWeight, selectedDate]);

  const mascotState = getMascotState();
  const goals = user?.goals ?? { calories: 2000, protein: 150, carbs: 250, fat: 65, water: 64 };
  const totals = dailyLog?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, waterIntake: 0 };

  const calProgress = goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1) : 0;

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const today = selectedDate;
    const log = await getDailyLog(user.uid, today);
    setDailyLog(log);
    setRefreshing(false);
  }, [user]);

  const handleAddWaterOz = async (oz: number) => {
    if (!user) return;
    await addWater(user.uid, selectedDate, oz);
    const log = await getDailyLog(user.uid, selectedDate);
    setDailyLog(log);
    setWaterInput('');
  };

  const handleToggleMeds = async () => {
    if (!user) return;
    const newValue = !dailyLog?.medicationsTaken;
    await updateMedications(user.uid, selectedDate, newValue);
    const log = await getDailyLog(user.uid, selectedDate);
    setDailyLog(log);
  };

  const handleLogWeight = () => {
    Alert.prompt
      ? Alert.prompt('Log Weight', 'Enter your weight (lbs):', async (text) => {
          const weight = parseFloat(text);
          if (!isNaN(weight) && user) {
            const today = selectedDate;
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
      const today = selectedDate;
      await updateWeight(user.uid, today, weight);
      const log = await getDailyLog(user.uid, today);
      setDailyLog(log);
    }
    setShowWeightModal(false);
    setWeightInput('');
  };

  const waterGlasses = totals.waterIntake || 0;
  const waterGoal = goals.water || 64;

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
          <Text style={styles.date}>{formatDateDisplay(selectedDate)}</Text>
        </View>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
          {!isToday(selectedDate) && (
            <Text style={styles.todayHint}>Tap for today</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>▶</Text>
        </TouchableOpacity>
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
            <Image source={henniImages[mascotState]} style={styles.mascotImage} resizeMode="contain" />
            <Text style={styles.mascotName}>Henni</Text>
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
            color={totals.calories > goals.calories ? Colors.warning : Colors.primary}
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

      {/* Extra Macros */}
      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Extra Macros</Text>
      <View style={[styles.macroRow, { marginBottom: 10 }]}>
        <MacroCard icon="🧂" label="Sodium" current={totals.sodium || 0} goal={goals.sodium || 2300} color="#9E9E9E" unit="mg" />
        <MacroCard icon="🫀" label="Cholest." current={totals.cholesterol || 0} goal={goals.cholesterol || 300} color="#E53935" unit="mg" />
      </View>
      <View style={styles.macroRow}>
        <MacroCard icon="🍬" label="Sugars" current={totals.sugars || 0} goal={goals.sugars || 50} color="#9C27B0" unit="g" />
        <MacroCard icon="🌾" label="Fiber" current={totals.fiber || 0} goal={goals.fiber || 28} color="#4CAF50" unit="g" />
      </View>

      {/* Water Tracker */}
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={styles.sectionTitle}>Water Intake 💧</Text>
          <Text style={styles.waterCount}>{waterGlasses} / {waterGoal} oz</Text>
        </View>
        <View style={styles.waterBarTrack}>
          <View style={[styles.waterBarFill, { width: `${Math.min((waterGlasses / waterGoal) * 100, 100)}%` }]} />
        </View>
        <View style={styles.waterBtnRow}>
          <TextInput
            style={[styles.weightInput, { flex: 1, marginBottom: 0, paddingVertical: 10, paddingHorizontal: 10 }]}
            keyboardType="numeric"
            placeholder="oz"
            placeholderTextColor={Colors.textSecondary}
            value={waterInput}
            onChangeText={setWaterInput}
          />
          <TouchableOpacity style={[styles.addWaterBtn, { justifyContent: 'center' }]} onPress={() => handleAddWaterOz(parseFloat(waterInput) || 0)}>
            <Text style={styles.addWaterText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addWaterBtn, { backgroundColor: Colors.surface, justifyContent: 'center' }]} onPress={() => handleAddWaterOz(-(parseFloat(waterInput) || 0))}>
            <Text style={[styles.addWaterText, { color: Colors.textSecondary }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Medications & Vitamins */}
      <View style={styles.medsCard}>
        <TouchableOpacity style={styles.medsRow} onPress={handleToggleMeds}>
          <View style={styles.medsLeft}>
            <Text style={styles.medsEmoji}>💊</Text>
            <Text style={styles.medsLabel}>Medications & Vitamins</Text>
          </View>
          <View style={[styles.medsCheck, dailyLog?.medicationsTaken && styles.medsCheckActive]}>
            <Text style={styles.medsCheckText}>{dailyLog?.medicationsTaken ? '✓' : ''}</Text>
          </View>
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
      {(dailyLog?.currentWeight || recentWeight) && (
        <View style={styles.weightDisplay}>
          <Text style={styles.weightLabel}>
            {dailyLog?.currentWeight ? "Today's Weight" : `Last tracked on ${formatDateDisplay(recentWeight!.date)}`}
          </Text>
          <Text style={styles.weightValue}>
            {dailyLog?.currentWeight || recentWeight?.weight} lbs
          </Text>
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
  addWaterBtn: {
    flex: 1,
    backgroundColor: Colors.water + '20',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addWaterText: { color: Colors.water, fontWeight: '700', fontSize: 14 },

  // Water Bar
  waterBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.water,
  },
  waterBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Medications
  medsCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  medsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medsEmoji: { fontSize: 24 },
  medsLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  medsCheck: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medsCheckActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  medsCheckText: { color: '#fff', fontSize: 18, fontWeight: '800' },

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

  // Date Navigator
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  todayHint: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },
});
