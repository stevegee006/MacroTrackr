'use client';

import { useState, useEffect, useCallback } from 'react';
import { TUTORIAL_STEPS } from '@/components/tutorial/tutorial-steps';

const STORAGE_KEY = 'macrotrackr-tutorial-complete';

export function useTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Auto-start on first visit (after a short delay for dashboard to load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsActive(true);
        setStepIndex(0);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Listen for restart event from Settings page
  useEffect(() => {
    function handleRestart() {
      setStepIndex(0);
      setIsActive(true);
    }
    window.addEventListener('tutorial-restart', handleRestart);
    return () => window.removeEventListener('tutorial-restart', handleRestart);
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      complete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, complete]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    stepIndex,
    step: TUTORIAL_STEPS[stepIndex],
    totalSteps: TUTORIAL_STEPS.length,
    next,
    back,
    skip,
    restart,
  };
}
