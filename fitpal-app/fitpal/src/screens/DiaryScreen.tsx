// Full diary: same data as HomeScreen but with edit/delete/quick-add — see
// README "Suggested next steps" for wiring copy-previous-day and quick-add.
import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { useAppStore } from "@/store/useAppStore";

export function DiaryScreen() {
  const entries = useAppStore((s) => s.todayEntries);
  const removeEntry = useAppStore((s) => s.removeTodayEntry);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Diary</Text>
      <FlatList
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={<Text style={styles.empty}>No foods logged today. Use the Scan tab to add one.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.foodName}</Text>
              <Text style={styles.detail}>
                {item.meal} · {item.servingDescription} · {Math.round(item.facts.calories)} kcal
              </Text>
            </View>
            <Pressable onPress={() => removeEntry(item.id)} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base, paddingTop: spacing(16) },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, paddingHorizontal: spacing(5), marginBottom: spacing(3) },
  list: { paddingHorizontal: spacing(5), paddingBottom: spacing(20) },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginTop: spacing(6) },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.hairline },
  name: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  detail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  remove: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.warning },
});
