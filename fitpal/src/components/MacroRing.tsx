// A single macro's progress, drawn as a ring using react-native-svg.
// Distinct color per macro (see theme) instead of a generic single-accent chart.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, type as fonts } from "@/theme";

interface Props {
  label: string;
  valueG: number;
  targetG: number;
  color: string;
  size?: number;
}

export function MacroRing({ label, valueG, targetG, color, size = 76 }: Props) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = targetG > 0 ? Math.min(1, valueG / targetG) : 0;
  const dashOffset = circumference * (1 - pct);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.hairline}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.centerText}>
            <Text style={[styles.value, { color: colors.ink }]}>{Math.round(valueG)}g</Text>
          </View>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.target}>of {Math.round(targetG)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 2 },
  centerText: { flex: 1, alignItems: "center", justifyContent: "center" },
  value: { fontFamily: fonts.bodyBold, fontSize: 14 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginTop: 4 },
  target: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted },
});
