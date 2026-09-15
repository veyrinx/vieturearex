'use client';

import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

interface AnimatedViewProps {
  children: ReactNode;
  style?: ViewStyle;
  enterAnimation?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'none';
  delay?: number;
  duration?: number;
  testID?: string;
}

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  slideUp: {
    initial: { opacity: 0, translateY: 30 },
    animate: { opacity: 1, translateY: 0 },
  },
  slideDown: {
    initial: { opacity: 0, translateY: -30 },
    animate: { opacity: 1, translateY: 0 },
  },
  slideLeft: {
    initial: { opacity: 0, translateX: 30 },
    animate: { opacity: 1, translateX: 0 },
  },
  slideRight: {
    initial: { opacity: 0, translateX: -30 },
    animate: { opacity: 1, translateX: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
  },
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
  },
};

export function AnimatedView({ 
  children, 
  style, 
  enterAnimation = 'slideUp', 
  delay = 0, 
  duration = 400,
  testID,
}: AnimatedViewProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const animation = animations[enterAnimation];

  useEffect(() => {
    if (enterAnimation === 'none') return;
    
    anim.setValue(0);
    const timeout = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [anim, enterAnimation, delay, duration]);

  const animatedStyle = {
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [animation.initial.opacity ?? 0, animation.animate.opacity ?? 1],
    }),
    transform: [
      { translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [animation.initial.translateY ?? 0, animation.animate.translateY ?? 0],
      })},
      { translateX: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [animation.initial.translateX ?? 0, animation.animate.translateX ?? 0],
      })},
      { scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [animation.initial.scale ?? 1, animation.animate.scale ?? 1],
      })},
    ],
  };

  return (
    <Animated.View 
      style={[styles.container, style, animatedStyle]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}

import { useRef, useEffect } from 'react';
import { Easing } from 'react-native';

const styles = StyleSheet.create({
  container: {
    opacity: 1,
  },
});