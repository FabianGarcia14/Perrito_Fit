import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface MacroCardProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  icon: string;
}

export default function MacroCard({
  label,
  current,
  goal,
  color,
  icon,
}: MacroCardProps) {
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const remaining = Math.max(goal - current, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${progress * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.values}>
        <Text style={{ color }}>{Math.round(current)}</Text>
        <Text style={styles.separator}> / </Text>
        <Text>{goal}g</Text>
      </Text>
      <Text style={styles.remaining}>{Math.round(remaining)}g left</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  icon: {
    fontSize: 22,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    marginBottom: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  values: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '700',
  },
  separator: {
    color: Colors.textSecondary,
  },
  remaining: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
