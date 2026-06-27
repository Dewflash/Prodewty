import React, { useEffect } from 'react';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';

// A globally available shared value representing time
export const globalTimeElapsed = makeMutable(0);
export const isGamePaused = makeMutable(false);

export function GameTickerProvider({ children }: { children: React.ReactNode }) {
  useFrameCallback((frameInfo) => {
    if (isGamePaused.value) return;
    if (frameInfo.timeSincePreviousFrame) {
      globalTimeElapsed.value += frameInfo.timeSincePreviousFrame;
    }
  });

  // Reset time on unmount or first mount
  useEffect(() => {
    globalTimeElapsed.value = 0;
  }, []);

  return <>{children}</>;
}
