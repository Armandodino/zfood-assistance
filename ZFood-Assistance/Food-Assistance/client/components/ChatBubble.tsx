import React from "react";
import { View, StyleSheet, Image } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ZFoodColors } from "@/constants/theme";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  language?: string;
  index: number;
}

export function ChatBubble({ message, isUser, language, index }: ChatBubbleProps) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}
    >
      {!isUser ? (
        <Image
          source={require("../../assets/images/illustrations/ai_assistant_avatar.png")}
          style={styles.avatar}
        />
      ) : null}

      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: ZFoodColors.primary600 }
            : { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <ThemedText
          type="body"
          style={{ color: isUser ? "#fff" : theme.text }}
        >
          {message}
        </ThemedText>

        {language && !isUser ? (
          <View style={[styles.languageBadge, { backgroundColor: ZFoodColors.accent + "20" }]}>
            <ThemedText type="small" style={{ color: ZFoodColors.accent, fontWeight: "600" }}>
              {language}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  bubble: {
    maxWidth: "75%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  languageBadge: {
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
