import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "@/constants/theme";

type ToastType = "success" | "error";
type ToastContextValue = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animate = useCallback(
    (toValue: number, offset: number, duration: number, onEnd?: () => void) => {
      Animated.parallel([
        Animated.timing(opacity, { toValue, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: offset, duration, useNativeDriver: true }),
      ]).start(onEnd);
    },
    [opacity, translateY]
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      opacity.setValue(0);
      translateY.setValue(-20);
      animate(1, 0, 200);

      timer.current = setTimeout(() => animate(0, -20, 250, () => setToast(null)), 2500);
    },
    [animate, opacity, translateY]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const isError = toast?.type === "error";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            isError ? styles.error : styles.success,
            { top: insets.top + spacing.md, opacity, transform: [{ translateY }] },
          ]}
        >
          <Ionicons name={isError ? "alert-circle" : "checkmark-circle"} size={20} color={colors.white} />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    elevation: 6,
    zIndex: 999,
  },
  success: { backgroundColor: colors.success },
  error: { backgroundColor: colors.danger },
  text: { ...typography.body, color: colors.white, flex: 1, fontWeight: "600" },
});