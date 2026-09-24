import { createContext, useContext } from 'react';

export const PhaseContext = createContext(null);

export function usePhase() {
  return useContext(PhaseContext) ?? { phase: null, setPhase: () => {} };
}