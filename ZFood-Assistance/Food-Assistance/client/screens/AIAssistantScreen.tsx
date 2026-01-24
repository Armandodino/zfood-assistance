import React, { useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, ZFoodColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  language?: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  text: "Bonjour! Je suis l'assistant IA ZFood. Je peux vous aider avec la gestion de vos clients et commandes, répondre à vos questions en français et dans les langues locales ivoiriennes. Vous pouvez me parler par écrit ou par la voix. Comment puis-je vous aider?",
  isUser: false,
  timestamp: new Date(),
};

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { clients, orders, getTotalRevenue, getUnpaidTotal } = useData();
  const { currentUser } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getUserInitial = () => {
    if (currentUser?.name) {
      return currentUser.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  const sendToAPI = async (userMessage: string, currentMessages: Message[]): Promise<string> => {
    try {
      const apiUrl = getApiUrl();
      
      const history = currentMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({ text: m.text, isUser: m.isUser }));
      
      const response = await fetch(`${apiUrl}/api/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: {
            totalClients: clients.length,
            totalOrders: orders.length,
            totalRevenue: getTotalRevenue(),
            unpaidTotal: getUnpaidTotal(),
          },
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur de connexion");
      }

      const data = await response.json();
      return data.reply || "Désolé, je n'ai pas pu générer une réponse.";
    } catch (error) {
      console.error("AI Chat error:", error);
      return "Je suis momentanément indisponible. Vérifiez votre connexion internet et réessayez.";
    }
  };

  const transcribeAudio = async (uri: string): Promise<string | null> => {
    try {
      const apiUrl = getApiUrl();
      
      // Read the audio file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            
            const transcribeResponse = await fetch(`${apiUrl}/api/voice-transcribe`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64 }),
            });

            if (!transcribeResponse.ok) {
              throw new Error("Transcription failed");
            }

            const data = await transcribeResponse.json();
            resolve(data.text || null);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Transcription error:", error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsTyping(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const reply = await sendToAPI(userMessage.text, updatedMessages);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsTyping(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "L'accès au microphone est nécessaire pour utiliser la commande vocale. Veuillez l'autoriser dans les paramètres de votre appareil.",
          [{ text: "OK" }]
        );
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement. Vérifiez les permissions du microphone.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        Alert.alert("Erreur", "Enregistrement échoué");
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsTyping(true);

      // Transcribe the audio
      const transcription = await transcribeAudio(uri);

      if (!transcription || transcription.trim().length === 0) {
        setIsTyping(false);
        Alert.alert("Erreur", "Impossible de transcrire l'audio. Essayez de parler plus clairement.");
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: transcription,
        isUser: true,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Get AI response
      const reply = await sendToAPI(transcription, updatedMessages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsTyping(false);
      setIsRecording(false);
      Alert.alert("Erreur", "Erreur lors de l'enregistrement vocal.");
    }
  };

  const handleVoicePress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const clearChat = () => {
    Alert.alert(
      "Effacer la conversation",
      "Voulez-vous vraiment effacer toute la conversation?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: () => {
            setMessages([WELCOME_MESSAGE]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.isUser;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 30).duration(300)}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: ZFoodColors.primary600 }]}>
            <Image
              source={require("../../assets/images/zfood-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: ZFoodColors.primary600, borderBottomRightRadius: 4 }
              : { backgroundColor: theme.backgroundSecondary, borderBottomLeftRadius: 4 },
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              { color: isUser ? "#fff" : theme.text },
            ]}
          >
            {item.text}
          </ThemedText>
          
          <ThemedText
            style={[
              styles.timestamp,
              { color: isUser ? "rgba(255,255,255,0.7)" : theme.textMuted },
            ]}
          >
            {item.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </ThemedText>
        </View>

        {isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: ZFoodColors.accent }]}>
            <ThemedText style={styles.userInitial}>{getUserInitial()}</ThemedText>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={[styles.header, { backgroundColor: theme.backgroundRoot, borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: ZFoodColors.primary600 }]}>
            <Image
              source={require("../../assets/images/zfood-logo.png")}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
              Assistant IA ZFood
            </ThemedText>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: ZFoodColors.success }]} />
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                Propulsé par DeepSeek
              </ThemedText>
            </View>
          </View>
        </View>
        <Pressable onPress={clearChat} style={styles.clearButton}>
          <Feather name="trash-2" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      />

      {isTyping && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.typingIndicator}>
          <View style={[styles.avatarContainer, { backgroundColor: ZFoodColors.primary600 }]}>
            <Image
              source={require("../../assets/images/zfood-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.typingBubble, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={ZFoodColors.primary600} />
            <ThemedText type="small" style={{ color: theme.textMuted, marginLeft: Spacing.sm }}>
              {isRecording ? "Transcription en cours..." : "En train d'écrire..."}
            </ThemedText>
          </View>
        </Animated.View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.voiceButton,
            {
              backgroundColor: isRecording ? ZFoodColors.error : theme.backgroundSecondary,
            },
          ]}
          onPress={handleVoicePress}
          disabled={isTyping}
        >
          <Feather
            name={isRecording ? "mic-off" : "mic"}
            size={20}
            color={isRecording ? "#fff" : theme.textMuted}
          />
        </Pressable>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
            },
          ]}
          placeholder={isRecording ? "Parlez maintenant..." : "Écrivez votre message..."}
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isTyping && !isRecording}
        />

        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !isTyping
                ? ZFoodColors.primary600
                : theme.backgroundSecondary,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping || isRecording}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <Feather
              name="send"
              size={20}
              color={inputText.trim() ? "#fff" : theme.textMuted}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerLogoImage: {
    width: 32,
    height: 32,
  },
  headerText: {
    gap: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  messageList: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.xs,
    overflow: "hidden",
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  userInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
