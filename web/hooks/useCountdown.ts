"use client";

import { useState, useEffect } from "react";

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState<number>(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const intervalId = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return {
    formatted: `${mm}:${ss}`,
    isExpired: seconds <= 0,
    secondsLeft: seconds,
  };
}
