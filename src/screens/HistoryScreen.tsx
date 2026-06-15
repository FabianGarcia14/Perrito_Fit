import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useStore } from '../store/useStore';
import { getDailyLog, getLogsBetweenDates, removeMealFromLog } from '../services/firestoreService';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { getLocalDateString } from '../utils/dateUtils';
import MacroCard from '../components/MacroCard';
import CircularProgress from '../components/CircularProgress';
import type { DailyLog, Meal } from '../types';

type FilterType = 'Week' | 'Month' | 'Year';

function getChartDates(filter: FilterType): { date: Date; label: string; dateStr: string; rangeStart: string; rangeEnd: string }[] {
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
      const dStr = getLocalDateString(d);
      days.push({ date: d, label: dayLabels[i], dateStr: dStr, rangeStart: dStr, rangeEnd: dStr });
    }
  } else if (filter === 'Month') {
    // 4 Weeks of the last 28 days
    const start = new Date(today);
    start.setDate(today.getDate() - 27);
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      days.push({ 
        date: weekStart, 
        label: `Wk ${i + 1}`, 
        dateStr: getLocalDateString(weekStart),
        rangeStart: getLocalDateString(weekStart),
        rangeEnd: getLocalDateString(weekEnd)
      });
    }
  } else if (filter === 'Year') {
    const currentYear = today.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, i, 1);
      const monthStr = String(i + 1).padStart(2, '0');
      // Approximate end of month for string comparison
      const endOfMonthStr = i === 11 ? `${currentYear + 1}-01-00` : `${currentYear}-${String(i + 2).padStart(2, '0')}-00`;
      
      days.push({ 
        date: d, 
        label: monthNames[i], 
        dateStr: `${currentYear}-${monthStr}`, 
        rangeStart: `${currentYear}-${monthStr}-01`,
        rangeEnd: `${currentYear}-${monthStr}-31`
      });
    }
  }
  return days;
}

export default function HistoryScreen() {
  const { user } = useStore();
  const navigation = useNavigation();
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly'>('Daily');
  const [selectedMealForOptions, setSelectedMealForOptions] = useState<Meal | null>(null);
  const [mealOptionsVisible, setMealOptionsVisible] = useState(false);
  const [calFilter, setCalFilter] = useState<FilterType>('Week');
  const [weightFilter, setWeightFilter] = useState<FilterType>('Week');
  const [proteinFilter, setProteinFilter] = useState<FilterType>('Week');
  const [calLogs, setCalLogs] = useState<DailyLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<DailyLog[]>([]);
  const [proteinLogs, setProteinLogs] = useState<DailyLog[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);

  const calDates = React.useMemo(() => getChartDates(calFilter), [calFilter]);
  const weightDates = React.useMemo(() => getChartDates(weightFilter), [weightFilter]);
  const proteinDates = React.useMemo(() => getChartDates(proteinFilter), [proteinFilter]);
  const weekDates = React.useMemo(() => getChartDates('Week'), []);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = getLocalDateString();

  useEffect(() => {
    loadData();
  }, [selectedDate, calFilter, weightFilter, proteinFilter]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const getFetchRange = (dates: any[]) => {
        if (dates.length === 0) return { start: todayStr, end: todayStr };
        return { start: dates[0].rangeStart, end: dates[dates.length - 1].rangeEnd };
      };

      const calRange = getFetchRange(calDates);
      const weightRange = getFetchRange(weightDates);
      const proteinRange = getFetchRange(proteinDates);
      const weekRange = getFetchRange(weekDates);

      const [log, cLogs, wLogs, pLogs, wkLogs] = await Promise.all([
        getDailyLog(user.uid, selectedDate),
        getLogsBetweenDates(user.uid, calRange.start, calRange.end),
        getLogsBetweenDates(user.uid, weightRange.start, weightRange.end),
        getLogsBetweenDates(user.uid, proteinRange.start, proteinRange.end),
        getLogsBetweenDates(user.uid, weekRange.start, weekRange.end),
      ]);
      setSelectedLog(log);
      setCalLogs(cLogs);
      setWeightLogs(wLogs);
      setProteinLogs(pLogs);
      setWeeklyLogs(wkLogs);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMealPress = (meal: Meal) => {
    setSelectedMealForOptions(meal);
    setMealOptionsVisible(true);
  };

  // Find max calories for chart scaling
  const maxCal = Math.max(...calLogs.map((l) => l.totals.calories), 1);
  const goalCal = user?.goals.calories ?? 2000;
  const chartMax = Math.max(maxCal, goalCal) * 1.1;

  // Find max protein for chart scaling
  const maxProtein = Math.max(...proteinLogs.map((l) => l.totals.protein), 1);
  const goalProtein = user?.goals.protein ?? 150;
  const proteinChartMax = Math.max(maxProtein, goalProtein) * 1.1;

  // Find min and max weight
  const validWeights = weightLogs.map(l => l.currentWeight).filter((w): w is number => w !== undefined && w > 0);
  const minWeight = validWeights.length > 0 ? Math.min(...validWeights) - 5 : 0;
  const maxWeight = validWeights.length > 0 ? Math.max(...validWeights) + 5 : 100;
  const weightRange = Math.max(maxWeight - minWeight, 1);

  // Weekly Stats Calculations
  const weeklyMealsList = weeklyLogs.flatMap(l => l.meals || []);
  const totalMealsCount = weeklyMealsList.filter(m => m.type !== 'Snack').length;
  const totalSnacksCount = weeklyMealsList.filter(m => m.type === 'Snack').length;
  const totalItems = weeklyMealsList.length;

  const renderWeeklyStats = () => {
    const startStr = weekDates[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekDates[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return (
      <View style={styles.weeklyStatsContainer}>
        <Text style={styles.weeklyDateRange}>{startStr} - {endStr}</Text>
        
        <View style={styles.weeklyCard}>
          <View style={styles.donutContainer}>
            {/* Base Ring */}
            <CircularProgress size={120} strokeWidth={14} progress={1} color={Colors.surface} backgroundColor="transparent" />
            
            {/* Meals Ring */}
            {totalItems > 0 && (
              <View style={styles.absoluteCenter}>
                <CircularProgress size={120} strokeWidth={14} progress={totalMealsCount / totalItems} color={Colors.primary} backgroundColor="transparent" />
              </View>
            )}
            
            {totalItems > 0 && (
              <View style={[styles.absoluteCenter, { transform: [{ rotate: `${(totalMealsCount / totalItems) * 360}deg` }] }]}>
                <CircularProgress size={120} strokeWidth={14} progress={totalSnacksCount / totalItems} color={Colors.secondary} backgroundColor="transparent" />
              </View>
            )}

            <View style={styles.donutCenter}>
              <Text style={styles.donutNumber}>{totalItems}</Text>
              <Text style={styles.donutLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.categoriesContainer}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>🍽️</Text>
              <View>
                <Text style={styles.categoryCount}>{totalMealsCount}</Text>
                <Text style={styles.categoryName}>Meals</Text>
              </View>
            </View>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>🍎</Text>
              <View>
                <Text style={styles.categoryCount}>{totalSnacksCount}</Text>
                <Text style={styles.categoryName}>Snacks</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Statistics</Text>
      </View>

      <View style={styles.segmentedControl}>
        <TouchableOpacity 
          style={[styles.segmentBtn, viewMode === 'Daily' && styles.segmentBtnActive]} 
          onPress={() => setViewMode('Daily')}
        >
          <Text style={[styles.segmentText, viewMode === 'Daily' && styles.segmentTextActive]}>Daily Log</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentBtn, viewMode === 'Weekly' && styles.segmentBtnActive]} 
          onPress={() => setViewMode('Weekly')}
        >
          <Text style={[styles.segmentText, viewMode === 'Weekly' && styles.segmentTextActive]}>Weekly Stats</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'Daily' && (
        <>
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
        </>
      )}

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />}

      {/* Daily Summary */}
      {!loading && viewMode === 'Daily' && selectedLog && (
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

          {/* Creatine UI */}
          <View style={[styles.medsRow, { marginTop: 10 }, selectedLog.creatineTaken ? styles.medsTaken : styles.medsNotTaken]}>
            <Text style={styles.medsIcon}>💪</Text>
            <Text style={[styles.medsText, selectedLog.creatineTaken ? styles.medsTextTaken : styles.medsTextNotTaken]}>
              {selectedLog.creatineTaken ? "Creatine Taken" : "Creatine Not Taken"}
            </Text>
            {selectedLog.creatineTaken ? <Text style={styles.medsCheck}>✅</Text> : <Text style={styles.medsCheck}>❌</Text>}
          </View>
          {selectedLog.currentWeight && (
            <Text style={styles.weightText}>Weight: {selectedLog.currentWeight} lbs</Text>
          )}

          {/* Fasting Info */}
          {(selectedLog.fastingStart || selectedLog.fastingEnd) && (
            <View style={styles.fastingHistoryCard}>
              <Text style={styles.fastingHistoryTitle}>Fasting Tracker ⏳</Text>
              {selectedLog.fastingStart && (
                <Text style={styles.fastingHistoryText}>
                  Started: {new Date(selectedLog.fastingStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {selectedLog.fastingEnd && (
                <Text style={styles.fastingHistoryText}>
                  Ended: {new Date(selectedLog.fastingEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {selectedLog.fastingStart && selectedLog.fastingEnd && (
                <Text style={styles.fastingHistoryDuration}>
                  Duration: {(() => {
                    const diff = new Date(selectedLog.fastingEnd).getTime() - new Date(selectedLog.fastingStart).getTime();
                    if (diff < 0) return '0h 0m';
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${minutes}m`;
                  })()}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {!loading && viewMode === 'Daily' && !selectedLog && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No data for this day</Text>
        </View>
      )}

      {/* Meals List */}
      {viewMode === 'Daily' && selectedLog && selectedLog.meals.length > 0 && (
        <View style={styles.mealsCard}>
          <Text style={styles.mealsTitle}>Meals ({selectedLog.meals.length})</Text>
          {selectedLog.meals.map((meal: Meal, idx: number) => (
            <TouchableOpacity key={meal.id || idx} style={styles.mealItem} onPress={() => handleMealPress(meal)}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealType}>{meal.type}</Text>
                <Text style={styles.mealName}>
                  {meal.name}
                  {meal.quantity && meal.quantity > 0 ? ` (${meal.quantity}${meal.unit || 'g'})` : ''}
                </Text>
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

      {/* Weekly Stats Overview */}
      {!loading && viewMode === 'Weekly' && renderWeeklyStats()}

      {/* Calories Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Calories 🔥</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setCalFilter('Week')} style={calFilter === 'Week' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={calFilter === 'Week' ? styles.filterTextActive : styles.filterText}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCalFilter('Month')} style={calFilter === 'Month' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={calFilter === 'Month' ? styles.filterTextActive : styles.filterText}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCalFilter('Year')} style={calFilter === 'Year' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={calFilter === 'Year' ? styles.filterTextActive : styles.filterText}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.chartContainer, { width: '100%' }]}>
          {/* Goal line */}
          <View
            style={[
              styles.goalLine,
              { bottom: `${(goalCal / chartMax) * 100}%` },
            ]}
          >
            <Text style={styles.goalLineLabel}>Goal: {goalCal}</Text>
          </View>
          <View style={[styles.barsRow, { gap: calFilter === 'Week' ? 6 : calFilter === 'Month' ? 12 : 4 }]}>
            {calDates.map(({ label, dateStr, rangeStart, rangeEnd }) => {
              let cal = 0;
              if (calFilter === 'Week') {
                const log = calLogs.find((l) => l.date === dateStr);
                cal = log?.totals.calories || 0;
              } else {
                const logsInRange = calLogs.filter(l => l.date >= rangeStart && l.date <= rangeEnd);
                if (logsInRange.length > 0) {
                  cal = logsInRange.reduce((sum, l) => sum + l.totals.calories, 0) / logsInRange.length;
                }
              }
              const heightPct = chartMax > 0 ? (cal / chartMax) * 100 : 0;
              const isOver = cal > goalCal;
              return (
                <View key={dateStr} style={styles.barWrapper}>
                  {(calFilter === 'Week' || calFilter === 'Month') && <Text style={styles.barValue}>{cal > 0 ? Math.round(cal) : ''}</Text>}
                  <View style={[styles.barTrack, { width: calFilter === 'Week' ? '80%' : calFilter === 'Month' ? 24 : 12 }]}>
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

      {/* Protein Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Protein 🥩</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setProteinFilter('Week')} style={proteinFilter === 'Week' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={proteinFilter === 'Week' ? styles.filterTextActive : styles.filterText}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProteinFilter('Month')} style={proteinFilter === 'Month' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={proteinFilter === 'Month' ? styles.filterTextActive : styles.filterText}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProteinFilter('Year')} style={proteinFilter === 'Year' ? styles.filterBtnActive : styles.filterBtn}>
              <Text style={proteinFilter === 'Year' ? styles.filterTextActive : styles.filterText}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.chartContainer, { width: '100%' }]}>
          {/* Goal line */}
          <View
            style={[
              styles.goalLine,
              { bottom: `${(goalProtein / proteinChartMax) * 100}%`, backgroundColor: Colors.secondary + '60' },
            ]}
          >
            <Text style={[styles.goalLineLabel, { color: Colors.secondary }]}>Goal: {goalProtein}g</Text>
          </View>
          <View style={[styles.barsRow, { gap: proteinFilter === 'Week' ? 6 : proteinFilter === 'Month' ? 12 : 4 }]}>
            {proteinDates.map(({ label, dateStr, rangeStart, rangeEnd }) => {
              let protein = 0;
              if (proteinFilter === 'Week') {
                const log = proteinLogs.find((l) => l.date === dateStr);
                protein = log?.totals.protein || 0;
              } else {
                const logsInRange = proteinLogs.filter(l => l.date >= rangeStart && l.date <= rangeEnd);
                if (logsInRange.length > 0) {
                  protein = logsInRange.reduce((sum, l) => sum + l.totals.protein, 0) / logsInRange.length;
                }
              }
              const heightPct = proteinChartMax > 0 ? (protein / proteinChartMax) * 100 : 0;
              const isOver = protein > goalProtein;
              return (
                <View key={dateStr} style={styles.barWrapper}>
                  {(proteinFilter === 'Week' || proteinFilter === 'Month') && <Text style={styles.barValue}>{protein > 0 ? Math.round(protein) : ''}</Text>}
                  <View style={[styles.barTrack, { width: proteinFilter === 'Week' ? '80%' : proteinFilter === 'Month' ? 24 : 12 }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.min(heightPct, 100)}%`,
                          backgroundColor: isOver ? Colors.success : Colors.secondary,
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
        <View style={[styles.chartContainer, { width: '100%' }]}>
          <View style={[styles.barsRow, { gap: weightFilter === 'Week' ? 6 : weightFilter === 'Month' ? 12 : 4 }]}>
            {weightDates.map(({ label, dateStr, rangeStart, rangeEnd }) => {
              let w: number | undefined;
              if (weightFilter === 'Week') {
                const log = weightLogs.find((l) => l.date === dateStr);
                w = log?.currentWeight;
              } else {
                const logsInRange = weightLogs.filter(l => l.date >= rangeStart && l.date <= rangeEnd && l.currentWeight && l.currentWeight > 0);
                if (logsInRange.length > 0) {
                  w = logsInRange.reduce((sum, l) => sum + (l.currentWeight as number), 0) / logsInRange.length;
                }
              }
              const heightPct = w ? ((w - minWeight) / weightRange) * 100 : 0;
              return (
                <View key={dateStr} style={styles.barWrapper}>
                  {(weightFilter === 'Week' || weightFilter === 'Month') && <Text style={styles.barValue}>{w ? Math.round(w) : '-'}</Text>}
                  <View style={[styles.barTrack, { backgroundColor: 'transparent', width: weightFilter === 'Week' ? '80%' : weightFilter === 'Month' ? 24 : 12 }]}>
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
      </View>

      <View style={{ height: 40 }} />

      <Modal
        visible={mealOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMealOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMealOptionsVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Meal Options</Text>
            {selectedMealForOptions && (
              <Text style={styles.modalSubtitle}>
                What would you like to do with {selectedMealForOptions.name}?
              </Text>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, styles.editBtn]}
              onPress={() => {
                if (selectedMealForOptions) {
                  setMealOptionsVisible(false);
                  (navigation as any).navigate('AddMeal', { editMeal: selectedMealForOptions, editDate: selectedDate });
                }
              }}
            >
              <Text style={styles.editBtnText}>✏️ Edit Quantity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.deleteBtn]}
              onPress={async () => {
                if (selectedMealForOptions && user) {
                  setMealOptionsVisible(false);
                  await removeMealFromLog(user.uid, selectedDate, selectedMealForOptions);
                  loadData();
                }
              }}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={() => setMealOptionsVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.text,
  },

  // Weekly Stats
  weeklyStatsContainer: {
    marginBottom: 24,
  },
  weeklyDateRange: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  weeklyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  donutContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  donutLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoriesContainer: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
    gap: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

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

  // Fasting History
  fastingHistoryCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  fastingHistoryTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  fastingHistoryText: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  fastingHistoryDuration: { fontSize: 14, color: Colors.success, fontWeight: '700', marginTop: 4 },

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.surface,
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: Colors.primary,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: Colors.surface,
    marginBottom: 0,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
