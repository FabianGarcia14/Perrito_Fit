import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { getDailyLog, getWeeklyLogs } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import type { DailyLog, Meal } from '../types';

function getWeekDates(): { date: Date; label: string; dateStr: string }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Go to Monday

  const days = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d,
      label: dayLabels[i],
      dateStr: d.toISOString().split('T')[0],
    });
  }
  return days;
}

export default function HistoryScreen() {
  const { user } = useStore();
  const [weekDates] = useState(getWeekDates);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [log, weekly] = await Promise.all([
        getDailyLog(user.uid, selectedDate),
        getWeeklyLogs(user.uid, weekDates[0].dateStr),
      ]);
      setSelectedLog(log);
      setWeeklyLogs(weekly);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Find max calories for chart scaling
  const maxCal = Math.max(...weeklyLogs.map((l) => l.totals.calories), 1);
  const goalCal = user?.goals.calories ?? 2000;
  const chartMax = Math.max(maxCal, goalCal) * 1.1;

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
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(selectedLog.totals.calories)}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(selectedLog.totals.protein)}g</Text>
              <Text style={styles.summaryLabel}>Protein</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(selectedLog.totals.carbs)}g</Text>
              <Text style={styles.summaryLabel}>Carbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(selectedLog.totals.fat)}g</Text>
              <Text style={styles.summaryLabel}>Fat</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{selectedLog.totals.waterIntake}🥛</Text>
              <Text style={styles.summaryLabel}>Water</Text>
            </View>
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
            <View key={meal.id || idx} style={styles.mealItem}>
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
            </View>
          ))}
        </View>
      )}

      {/* Weekly Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Calories</Text>
        <View style={styles.chartContainer}>
          {/* Goal line */}
          <View
            style={[
              styles.goalLine,
              { bottom: `${(goalCal / chartMax) * 100}%` },
            ]}
          >
            <Text style={styles.goalLineLabel}>Goal: {goalCal}</Text>
          </View>
          <View style={styles.barsRow}>
            {weekDates.map(({ label, dateStr }) => {
              const log = weeklyLogs.find((l) => l.date === dateStr);
              const cal = log?.totals.calories || 0;
              const heightPct = chartMax > 0 ? (cal / chartMax) * 100 : 0;
              const isOver = cal > goalCal;
              return (
                <View key={dateStr} style={styles.barWrapper}>
                  <Text style={styles.barValue}>{Math.round(cal)}</Text>
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  weightText: { fontSize: 14, color: Colors.accent, marginTop: 12, textAlign: 'center', fontWeight: '600' },

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
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },
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
