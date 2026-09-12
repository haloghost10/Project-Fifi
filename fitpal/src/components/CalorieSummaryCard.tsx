// The dashboard's signature element: calories remaining shown as a plate-style
// arc (ties back to the food/nutrition subject matter) rather than a generic
// donut chart or a plain progress bar.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, type as fonts } from "@/theme";

interface Props {
  consumed: number;
  target: number;
}

export function CalorieSummaryCard({ consumed, target }: Props) {
  const remaining = target - consumed;
  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const dashOffset = circumference * (1 - pct);
  const over = remaining < 0;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.hairline} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={over ? colors.warning : colors.brand}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.bigNumber}>{Math.abs(Math.round(remaining))}</Text>
          <Text style={styles.subLabel}>{over ? "kcal over" : "kcal left"}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Stat label="Eaten" value={Math.round(consumed)} />
        <Stat label="Target" value={Math.round(target)} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 12 },
  center: { alignItems: "center", justifyContent: "center" },
  bigNumber: { fontFamily: fonts.display, fontSize: 36, color: colors.ink },
  subLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  row: { flexDirection: "row", gap: 32, marginTop: 16 },
  stat: { alignItems: "center" },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
