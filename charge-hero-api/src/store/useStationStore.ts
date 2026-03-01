// ==========================================
// Station store — Zustand
// ==========================================

import { create } from 'zustand';
import type { Station, StationStatus, ApiError, UpdateStationPayload } from '@/domain/types';
import { stationsApi } from '@/api/stations';
import { toast } from 'sonner';

// Fun messages for WS events
const FUN_MESSAGES: Record<string, string[]> = {
  station_created: [
    'Nouvelle borne installee ! La ville s\'electrise !',
    'Un nouveau point de charge emerge du bitume !',
    'Une borne toute neuve vient d\'apparaitre !',
  ],
  station_updated: [
    'Une borne change d\'etat... suspense !',
    'Mise a jour detectee sur le reseau !',
  ],
  station_deleted: [
    'Une borne a ete demantelee... adieu !',
    'Station supprimee. Le quartier pleure.',
  ],
  charging: [
    'Une Tesla affamee arrive !',
    'Quelqu\'un branche sa voiture !',
    'Session de charge initiee !',
  ],
  out_of_order: [
    'Panne causee par un ecureuil electrique !',
    'De la fumee s\'echappe... pas bon signe !',
    'Alerte ! Borne en detresse !',
  ],
  available: [
    'Borne de retour en service !',
    'Prete a charger, capitaine !',
  ],
};

function randomFun(key: string): string {
  const msgs = FUN_MESSAGES[key];
  if (!msgs?.length) return '';
  return msgs[Math.floor(Math.random() * msgs.length)];
}

interface StationState {
  stations: Map<string, Station>;
  selectedId: string | null;
  loading: boolean;
  wsConnected: boolean;

  // Actions
  fetchAll: () => Promise<void>;
  createStation: (name: string, x: number, y: number) => Promise<Station>;
  updateStation: (id: string, payload: Partial<UpdateStationPayload>) => Promise<Station>;
  deleteStation: (id: string) => Promise<void>;
  repairStation: (id: string) => Promise<Station>;
  simulate: () => Promise<void>;
  selectStation: (id: string | null) => void;
  setWsConnected: (v: boolean) => void;

  // WS handlers
  handleWsCreated: (station: Station) => void;
  handleWsUpdated: (station: Station) => void;
  handleWsDeleted: (id: string) => void;
  handleWsSimulated: (stations: Station[]) => void;

  // Derived
  getStationAt: (x: number, y: number) => Station | undefined;
  getSelected: () => Station | undefined;
  getStats: () => {
    total: number;
    available: number;
    charging: number;
    outOfOrder: number;
    energyScore: number;
  };
}

export const useStationStore = create<StationState>((set, get) => ({
  stations: new Map(),
  selectedId: null,
  loading: false,
  wsConnected: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const list = await stationsApi.getAll();
      const map = new Map<string, Station>();
      list.forEach((s) => map.set(s.id, s));
      set({ stations: map });
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || 'Erreur chargement stations');
    } finally {
      set({ loading: false });
    }
  },

  createStation: async (name, x, y) => {
    const station = await stationsApi.create({ name, x, y });
    set((state) => {
      const next = new Map(state.stations);
      next.set(station.id, station);
      return { stations: next };
    });
    return station;
  },

  updateStation: async (id, payload) => {
    // Optimistic update
    const prev = get().stations.get(id);
    if (prev) {
      const optimistic = { ...prev, ...payload };
      set((state) => {
        const next = new Map(state.stations);
        next.set(id, optimistic);
        return { stations: next };
      });
    }
    try {
      const station = await stationsApi.patch(id, payload);
      set((state) => {
        const next = new Map(state.stations);
        next.set(id, station);
        return { stations: next };
      });
      return station;
    } catch (e) {
      // Rollback on error
      if (prev) {
        set((state) => {
          const next = new Map(state.stations);
          next.set(id, prev);
          return { stations: next };
        });
      }
      throw e;
    }
  },

  deleteStation: async (id) => {
    try {
      await stationsApi.remove(id);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 404) {
        toast.info('Station deja supprimee');
      } else {
        toast.error(err.message || 'Erreur suppression');
        throw e; // Don't remove from store on 500
      }
    }
    set((state) => {
      const next = new Map(state.stations);
      next.delete(id);
      const selectedId = state.selectedId === id ? null : state.selectedId;
      return { stations: next, selectedId };
    });
  },

  repairStation: async (id) => {
    const station = await stationsApi.patch(id, { status: 'available' });
    set((state) => {
      const next = new Map(state.stations);
      next.set(id, station);
      return { stations: next };
    });
    return station;
  },

  simulate: async () => {
    try {
      await stationsApi.simulate();
      toast.info('Simulation lancee !');
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || 'Erreur simulation');
    }
  },

  selectStation: (id) => set({ selectedId: id }),

  setWsConnected: (v) => {
    set({ wsConnected: v });
    if (!v) {
      toast.warning('Connexion temps reel perdue...');
    }
  },

  // WS handlers
  handleWsCreated: (station) => {
    set((state) => {
      const next = new Map(state.stations);
      next.set(station.id, station);
      return { stations: next };
    });
    toast.success(randomFun('station_created'));
  },

  handleWsUpdated: (station) => {
    set((state) => {
      const next = new Map(state.stations);
      next.set(station.id, station);
      return { stations: next };
    });
    // Fun toast based on new status
    const funKey = station.status === 'out_of_order' ? 'out_of_order'
                 : station.status === 'charging' ? 'charging'
                 : 'available';
    toast(randomFun(funKey), { duration: 3000 });
  },

  handleWsDeleted: (id) => {
    set((state) => {
      const next = new Map(state.stations);
      next.delete(id);
      const selectedId = state.selectedId === id ? null : state.selectedId;
      return { stations: next, selectedId };
    });
    toast(randomFun('station_deleted'), { duration: 3000 });
  },

  handleWsSimulated: (stations) => {
    set((state) => {
      const next = new Map(state.stations);
      stations.forEach((s) => next.set(s.id, s));
      return { stations: next };
    });
    toast.info('⚡ Simulation terminée ! Le réseau a changé.');
  },

  // Derived
  getStationAt: (x, y) => {
    const { stations } = get();
    for (const s of stations.values()) {
      if (s.x === x && s.y === y) return s;
    }
    return undefined;
  },

  getSelected: () => {
    const { stations, selectedId } = get();
    if (!selectedId) return undefined;
    return stations.get(selectedId);
  },

  getStats: () => {
    const { stations } = get();
    let available = 0, charging = 0, outOfOrder = 0;
    stations.forEach((s) => {
      if (s.status === 'available') available++;
      else if (s.status === 'charging') charging++;
      else outOfOrder++;
    });
    const total = stations.size;
    const energyScore = available * 2 + charging * 1 + outOfOrder * -2;
    return { total, available, charging, outOfOrder, energyScore };
  },
}));
