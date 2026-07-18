import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../animation/useReducedMotion';
import { colors, radius, spacing } from '../theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Fires once the exit animation has finished and the modal is fully gone.
   * Use this to sequence follow-up navigation (e.g. router.push) after the
   * sheet has left the screen, instead of racing the two animations.
   */
  onDismissed?: () => void;
  children?: ReactNode;
  testID?: string;
}

// RN's Modal animationType="slide" slides the ENTIRE modal subtree — including
// the full-screen scrim — up from the bottom, which reads as a big translucent
// pane gliding over the screen. So the Modal renders with animationType="none"
// and the two layers animate independently: the scrim only fades (it never
// moves), and the panel alone slides up with a gentle ease-out, per
// docs/DESIGN_SYSTEM.md's Motion section.
//
// The native Modal is driven by its `visible` prop and stays mounted while
// idle (visible={false}) rather than being conditionally unmounted. On Android,
// unmounting a `<Modal>` that RN still considers visible — which is exactly
// what happens when a list row containing a Sheet is removed (e.g. deleting a
// routine on the Today screen) — can skip the native dialog's dismiss
// lifecycle and leave a transparent, touch-swallowing window on top of the app,
// making it unresponsive. Toggling `visible` false lets RN tear the native
// window down properly, so a later parent unmount only ever removes an
// already-dismissed Modal.
export const SHEET_ENTER_DURATION_MS = 260;
export const SHEET_EXIT_DURATION_MS = 200;
const BACKDROP_MAX_OPACITY = 0.4;
// Fixed slide distance, chosen taller than any sheet in the app so the panel
// always starts fully below the screen edge. A constant (rather than the
// measured height) keeps the interpolation stable from the very first frame —
// measuring would only be ready after layout, one frame into the animation.
const PANEL_SLIDE_DISTANCE = 480;

/** Reusable bottom-sheet/modal, dismissed by backdrop tap or back button. */
export function Sheet({ visible, onClose, onDismissed, children, testID }: SheetProps) {
  // While `exiting`, the Modal stays mounted so the exit animation can play;
  // it only unmounts once that animation has finished.
  const [exiting, setExiting] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();
  const onDismissedRef = useRef(onDismissed);

  useEffect(() => {
    onDismissedRef.current = onDismissed;
  });

  // Derived-during-render (the sanctioned adjust-state-on-prop-change
  // pattern): a visible→hidden flip starts the exit phase.
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setExiting(true);
    }
  }

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: reducedMotion ? 0 : SHEET_ENTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!exiting) {
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? 0 : SHEET_EXIT_DURATION_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setExiting(false);
        onDismissedRef.current?.();
      }
    });
  }, [visible, exiting, progress, reducedMotion]);

  // Shown during both the open state and the exit animation, so the native
  // window stays up while the panel slides back down. Once it settles false,
  // RN dismisses the dialog. The inner content is gated on the same flag so a
  // closed sheet renders nothing (its children never mount while idle), even
  // though the Modal element itself remains in the tree.
  const shown = visible || exiting;

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      {shown ? (
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, BACKDROP_MAX_OPACITY],
                }),
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
              testID={testID ? `${testID}-backdrop` : undefined}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [PANEL_SLIDE_DISTANCE, 0],
                    }),
                  },
                ],
              },
            ]}
            testID={testID ? `${testID}-content` : undefined}
          >
            <View style={styles.grabber} />
            {children}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    // Scrim dimming isn't part of the token set yet (T013 covers solid
    // colors only); revisit if/when an overlay token is introduced. Final
    // opacity is animated in (BACKDROP_MAX_OPACITY), not set here.
    backgroundColor: colors.textPrimary,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  // Drag-handle affordance marking the panel as a sheet; purely visual
  // (dismissal stays backdrop tap / back button).
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
});
