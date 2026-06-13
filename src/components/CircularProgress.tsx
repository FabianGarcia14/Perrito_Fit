import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 – 1
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

/**
 * Pure-View circular progress ring built with two rotated half-circles.
 * No SVG dependency required.
 */
export default function CircularProgress({
  size,
  strokeWidth,
  progress,
  color = Colors.primary,
  backgroundColor = Colors.surface,
  children,
}: CircularProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const radius = size / 2;
  const innerSize = size - strokeWidth * 2;

  // Degrees filled (0-360)
  const degrees = clampedProgress * 360;

  // For the half-circle trick we need to handle <180° and ≥180° separately.
  const rotate1 = degrees > 180 ? 180 : degrees;
  const rotate2 = degrees > 180 ? degrees - 180 : 0;
  const showSecondHalf = degrees > 180;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* ── Right half (0-180°) ───────────────────── */}
      <View
        style={[
          styles.halfClip,
          {
            width: radius,
            height: size,
            left: radius,
            overflow: 'hidden',
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: color,
              left: -radius,
              transform: [{ rotate: `${rotate1}deg` }],
            },
          ]}
        />
      </View>

      {/* ── Left half (180-360°) ──────────────────── */}
      {showSecondHalf && (
        <View
          style={[
            styles.halfClip,
            {
              width: radius,
              height: size,
              left: 0,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={[
              styles.halfCircle,
              {
                width: size,
                height: size,
                borderRadius: radius,
                borderWidth: strokeWidth,
                borderColor: color,
                left: radius,
                transform: [{ rotate: `${rotate2}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Center content */}
      <View
        style={[
          styles.center,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
  halfClip: {
    position: 'absolute',
    top: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transformOrigin: 'center center',
  },
  center: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
