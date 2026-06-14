import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useStore } from '../store/useStore';
import { getDailyLog, getWeeklyLogs, removeMealFromLog, getLogsBetweenDates } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { getLocalDateString } from '../utils/dateUtils';
import MacroCard from '../components/MacroCard';
import type { DailyLog, Meal } from '../types';

type FilterType = 'Week' | 'Month' | 'Year';

function getChartDates(filter: FilterType): { date: Date; label: string; dateStr: string }[] {
  const today = new Date();
  const days = [];
  
  if (filter === 'Week') {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); 
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ date: d, label: dayLabels[i], dateStr: getLocalDateString(d) });
    }
  } else if (filter === 'Month') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ 
        date: d, 
        label: i % 5 === 0 ? d.getDate().toString() : '', 
        dateStr: getLocalDateString(d) 
      });
    }
  } else if (filter === 'Year') {
    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ 
        date: d, 
        label: d.getDate() === 1 ? (d.getMonth() + 1).toString() : '', 
        dateStr: getLocalDateString(d) 
      });
    }
  }
  return days;
}

export default function HistoryScreen() {
  const { user } = useStore();
  const navigation = useNavigation();
  const [calFilter, setCalFilter] = useState<FilterType>('Week');
  const [weightFilter, setWeightFilter] = useState<FilterType>('Week');
  const [calLogs, setCalLogs] = useState<DailyLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<DailyLog[]>([]);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);

  const calDates = React.useMemo(() => getChartDates(calFilter), [calFilter]);
  const weightDates = React.useMemo(() => getChartDates(weightFilter), [weightFilter]);
  const weekDates = React.useMemo(() => getChartDates('Week'), []);

  const [loading, setLoading] = useState(false);

  const todayStr = getLocalDateString();

  useEffect(() => {
    loadData();
  }, [selectedDate, calFilter, weightFilter]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [log, cLogs, wLogs] = await Promise.all([
        getDailyLog(user.uid, selectedDate),
        getLogsBetweenDates(user.uid, calDates[0].dateStr, calDates[calDates.length - 1].dateStr),
        getLogsBetweenDates(user.uid, weightDates[0].dateStr, weightDates[weightDates.length - 1].dateStr),
      ]);
      setSelectedLog(log);
      setCalLogs(cLogs);
      setWeightLogs(wLogs);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMealPress = (meal: Meal) => {
    Alert.alert(
      'Meal Options',
      `What would you like to do with ${meal.name}?`,
      [
        {
          text: 'Edit',
          onPress: () => {
            (navigation as any).navigate('MainTabs', {
              screen: 'AddMeal',
              params: { editMeal: meal, editDate: selectedDate },
            });
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await removeMealFromLog(user.uid, selectedDate, meal);
              loadData();
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Find max calories for chart scaling
  const maxCal = Math.max(...calLogs.map((l) => l.totals.calories), 1);
  const goalCal = user?.goals.calories ?? 2000;
  const chartMax = Math.max(maxCal, goalCal) * 1.1;

  // Find min and max weight
  const validWeights = weightLogs.map(l => l.currentWeight).filter((w): w is number => w !== undefined && w > 0);
  const minWeight = validWeights.length > 0 ? Math.min(...validWeights) - 5 : 0;
  const maxWeight = validWeights.length > 0 ? Math.max(...validWeights) + 5 : 100;
  const weightRange = Math.max(maxWeight - minWeight, 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History 📊</Text>

      {/* Week Calendar */}
      <View style={styles.weekRow}>
        {weekDates.map(({ label, dateStr, date }) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayBtn, isSelected && styles.dayBtnSelected]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{label}</Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && styles.dayToday]}>
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />}

      {/* Daily Summary */}
      {!loading && selectedLog && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Daily Summary</Text>
          {/* Calories */}
          <View style={[styles.macroRow, { marginBottom: 16 }]}>
            <MacroCard icon="🔥" label="Calories" current={selectedLog.totals.calories} goal={user?.goals?.calories || 2000} color={Colors.primary} unit="kcal" />
          </View>

          {/* Main Macros */}
          <View style={[styles.macroRow, { marginBottom: 16 }]}>
            <MacroCard icon="🥩" label="Protein" current={selectedLog.totals.protein} goal={user?.goals?.protein || 150} color={Colors.secondary} />
            <MacroCard icon="🍞" label="Carbs" current={selectedLog.totals.carbs} goal={user?.goals?.carbs || 250} color={Colors.warning} />
            <MacroCard icon="🥑" label="Fat" current={selectedLog.totals.fat} goal={user?.goals?.fat || 65} color={Colors.success} />
          </View>

          {/* Extra Macros */}
          <View style={[styles.macroRow, { marginBottom: 10 }]}>
            <MacroCard icon="🧂" label="Sodium" current={selectedLog.totals.sodium || 0} goal={user?.goals?.sodium || 2300} color="#9E9E9E" unit="mg" />
            <MacroCard icon="🫀" label="Cholest." current={selectedLog.totals.cholesterol || 0} goal={user?.goals?.cholesterol || 300} color="#E53935" unit="mg" />
          </View>
          <View style={[styles.macroRow, { marginBottom: 16 }]}>
            <MacroCard icon="🍬" label="Sugars" current={selectedLog.totals.sugars || 0} goal={user?.goals?.sugars || 50} color="#9C27B0" unit="g" />
            <MacroCard icon="🌾" label="Fiber" current={selectedLog.totals.fiber || 0} goal={user?.goals?.fiber || 28} color="#4CAF50" unit="g" />
          </View>

          {/* Water Intake */}
          <View style={[styles.macroRow, { marginBottom: 16 }]}>
            <MacroCard icon="💧" label="Water Intake" current={selectedLog.totals.waterIntake} goal={user?.goals?.water || 64} color="#29B6F6" unit="oz" />
          </View>

          {/* Medications UI */}
          <View style={[styles.medsRow, selectedLog.medicationsTaken ? styles.medsTaken : styles.medsNotTaken]}>
            <Text style={styles.medsIcon}>💊</Text>
            <Text style={[styles.medsText, selectedLog.medicationsTaken ? styles.medsTextTaken : styles.medsTextNotTaken]}>
              {selectedLog.medicationsTaken ? "Medications Taken" : "Medications Not Taken"}
            </Text>
            {selectedLog.medicationsTaken ? <Text style={styles.medsCheck}>✅</Text> : <Text style={styles.medsCheck}>❌</Text>}
          </View>
          {selectedLog.currentWeight && (
            <Text style={styles.weightText}>Weight: {selectedLog.currentWeight} lbs</Text>
          )}
        </View>
      )}

      {!loading && !selectedLog && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No data for this day</Text>
        </View>
      )}

      {/* Meals List */}
      {selectedLog && selectedLog.meals.length > 0 && (
        <View style={styles.mealsCard}>
          <Text style={styles.mealsTitle}>Meals ({selectedLog.meals.length})</Text>
          {selectedLog.meals.map((meal: Meal, idx: number) => (
            <TouchableOpacity key={meal.id || idx} style={styles.mealItem} onPress={() => handleMealPress(meal)}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealType}>{meal.type}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>
              </View>
              <View style={styles.mealRight}>
                <Text style={styles.mealCal}>{Math.round(meal.calories)} kcal</Text>
                <Text style={styles.mealMacros}>
                  P:{meal.macros.protein}g C:{meal.macros.carbs}g F:{meal.macros.fat}g
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Calories Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Calories</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setCalFilter('Week')} style={calFilter === 'Week' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={calFilter === 'Week' ? styles.filterTextActive : styles.filterText}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCalFilter('Month')} style={calFilter === 'Month' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={calFilter === 'Month' ? styles.filterTextActive : styles.filterText}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.chartContainer, { width: calFilter === 'Week' ? '100%' : 800 }]}>
            {/* Goal line */}
            <View
              style={[
                styles.goalLine,
                { bottom: `${(goalCal / chartMax) * 100}%` },
              ]}
            >
              <Text style={styles.goalLineLabel}>Goal: {goalCal}</Text>
            </View>
            <View style={[styles.barsRow, { gap: calFilter === 'Week' ? 6 : 2 }]}>
              {calDates.map(({ label, dateStr }) => {
                const log = calLogs.find((l) => l.date === dateStr);
                const cal = log?.totals.calories || 0;
                const heightPct = chartMax > 0 ? (cal / chartMax) * 100 : 0;
                const isOver = cal > goalCal;
                return (
                  <View key={dateStr} style={styles.barWrapper}>
                    {calFilter === 'Week' && <Text style={styles.barValue}>{Math.round(cal)}</Text>}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.min(heightPct, 100)}%`,
                            backgroundColor: isOver ? Colors.warning : Colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Weight History Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Weight History</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setWeightFilter('Week')} style={weightFilter === 'Week' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={weightFilter === 'Week' ? styles.filterTextActive : styles.filterText}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWeightFilter('Month')} style={weightFilter === 'Month' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={weightFilter === 'Month' ? styles.filterTextActive : styles.filterText}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWeightFilter('Year')} style={weightFilter === 'Year' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={weightFilter === 'Year' ? styles.filterTextActive : styles.filterText}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.chartContainer, { width: weightFilter === 'Week' ? '100%' : weightFilter === 'Month' ? 800 : 2000 }]}>
            <View style={[styles.barsRow, { gap: weightFilter === 'Week' ? 6 : weightFilter === 'Month' ? 2 : 1 }]}>
              {weightDates.map(({ label, dateStr }) => {
                const log = weightLogs.find((l) => l.date === dateStr);
                const w = log?.currentWeight;
                const heightPct = w ? ((w - minWeight) / weightRange) * 100 : 0;
                return (
                  <View key={dateStr} style={styles.barWrapper}>
                    {weightFilter === 'Week' && <Text style={styles.barValue}>{w ? w : '-'}</Text>}
                    <View style={[styles.barTrack, { backgroundColor: 'transparent' }]}>
                      {w ? (
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max(Math.min(heightPct, 100), 5)}%`,
                              backgroundColor: Colors.accent,
                              width: '100%',
                              minHeight: 4,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.barLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 20 },

  // Week Row
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 4,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.card,
  },
  dayBtnSelected: { backgroundColor: Colors.primary },
  dayLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  dayLabelSelected: { color: Colors.text },
  dayNumber: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 4 },
  dayNumberSelected: { color: '#fff' },
  dayToday: { color: Colors.warning },

  // Summary
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  weightText: { fontSize: 14, color: Colors.accent, marginTop: 16, textAlign: 'center', fontWeight: '600' },
  
  // Meds
  medsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  medsTaken: { backgroundColor: Colors.success + '20', borderColor: Colors.success },
  medsNotTaken: { backgroundColor: Colors.surface, borderColor: Colors.inputBorder },
  medsIcon: { fontSize: 24, marginRight: 12 },
  medsText: { flex: 1, fontSize: 16, fontWeight: '700' },
  medsTextTaken: { color: Colors.success },
  medsTextNotTaken: { color: Colors.textSecondary },
  medsCheck: { fontSize: 20 },

  // Empty
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },

  // Meals
  mealsCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  mealsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  mealLeft: { flex: 1 },
  mealType: { fontSize: 11, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  mealName: { fontSize: 14, color: Colors.text, fontWeight: '600', marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCal: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  mealMacros: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surface,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 8, padding: 2 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  filterBtnActive: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
  placeholderChart: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12 },
  placeholderText: { color: Colors.textSecondary, fontSize: 14 },
  chartContainer: { height: 200, position: 'relative' },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.warning + '60',
    zIndex: 1,
  },
  goalLineLabel: { position: 'absolute', right: 0, top: -14, fontSize: 10, color: Colors.warning },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'flex-end', gap: 6 },
  barWrapper: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 9, color: Colors.textSecondary, marginBottom: 4 },
  barTrack: {
    width: '80%',
    height: 140,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: { borderRadius: 8, minHeight: 2 },
  barLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 6, fontWeight: '600' },
});
