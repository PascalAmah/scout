import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface OnboardingState {
  step: number
  roles: string[]
  remote: boolean
  locations: string[]
  resumeName: string | null
  setStep: (step: number) => void
  setRoles: (roles: string[]) => void
  setRemote: (remote: boolean) => void
  addLocation: (location: string) => void
  removeLocation: (location: string) => void
  setResumeName: (name: string | null) => void
  reset: () => void
}

const INITIAL_STATE = {
  step: 0,
  roles: [],
  remote: true,
  locations: [],
  resumeName: null,
}

/**
 * Local UI state for the onboarding wizard. Persisted to localStorage so a
 * page refresh (or an accidental close) doesn't lose the user's step or
 * selections. Server data (the completed answers) stays in TanStack Query and
 * the API.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setStep: (step) => set({ step }),
      setRoles: (roles) => set({ roles }),
      setRemote: (remote) => set({ remote }),
      addLocation: (location) =>
        set((state) => ({
          locations: state.locations.includes(location)
            ? state.locations
            : [...state.locations, location],
        })),
      removeLocation: (location) =>
        set((state) => ({ locations: state.locations.filter((l) => l !== location) })),
      setResumeName: (name) => set({ resumeName: name }),
      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'scout-onboarding',
      storage: createJSONStorage(() => localStorage),
      // Only wizard data is persisted; actions come from the initial state.
      partialize: (state) => ({
        step: state.step,
        roles: state.roles,
        remote: state.remote,
        locations: state.locations,
        resumeName: state.resumeName,
      }),
    },
  ),
)
