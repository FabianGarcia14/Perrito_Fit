import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface StreakBadgeProps {
  streak: number;
  size?: number;
}

export default function StreakBadge({ streak, size = 44 }: StreakBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fire breathing/pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  if (streak <= 0) return null;

  return (
    <View style={[styles.container, { height: size }]}>
      <Animated.View style={[styles.badge, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.icon}>🔥</Text>
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakText}>Day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 100, 50, 0.15)', // Light vibrant orange background
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 50, 0.4)',
    shadowColor: '#FF6432',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    marginRight: 6,
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNumber: {
    color: '#FF7043',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 4,
  },
  streakText: {
    color: '#FF7043',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
});
