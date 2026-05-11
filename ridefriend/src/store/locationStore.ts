// Ficheiro: src/store/locationStore.ts | Função: estado da localização + listas próximas (P1)
import { create } from 'zustand';
import { Location, NearbyDriver, NearbyPassenger } from '@types/index';

interface LocationStore {
  myLocation: Location | null;
  nearbyDrivers: NearbyDriver[];
  nearbyPassengers: NearbyPassenger[];
  isTracking: boolean;
  setMyLocation: (location: Location | null) => void;
  setNearbyDrivers: (drivers: NearbyDriver[]) => void;
  setNearbyPassengers: (passengers: NearbyPassenger[]) => void;
  setIsTracking: (isTracking: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  myLocation: null,
  nearbyDrivers: [],
  nearbyPassengers: [],
  isTracking: false,

  setMyLocation: (location) => {
    set({ myLocation: location });
  },

  setNearbyDrivers: (drivers) => {
    set({ nearbyDrivers: drivers });
  },

  setNearbyPassengers: (passengers) => {
    set({ nearbyPassengers: passengers });
  },

  setIsTracking: (isTracking) => {
    set({ isTracking });
  },

  clearLocation: () => {
    set({
      myLocation: null,
      nearbyDrivers: [],
      nearbyPassengers: [],
      isTracking: false,
    });
  },
}));
