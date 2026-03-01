// ==========================================
// useWebSocket — connects WS and routes events to store
// ==========================================

import { useEffect, useRef } from 'react';
import { wsManager } from '@/ws/socket';
import { useStationStore } from '@/store/useStationStore';
import type { Station, WsEvent } from '@/domain/types';

export function useWebSocket() {
  const handlersRef = useRef(useStationStore.getState());

  // Keep handlers ref current
  useEffect(() => {
    return useStationStore.subscribe((state) => {
      handlersRef.current = state;
    });
  }, []);

  useEffect(() => {
    wsManager.connect();

    const unsubMessage = wsManager.onMessage((event: WsEvent) => {
  console.log("WS EVENT RECEIVED:", event);

  const h = handlersRef.current;

  switch (event.type) {
    case 'station_created':
      h.handleWsCreated(event.payload as Station);
      break;

    case 'station_updated':
      h.handleWsUpdated(event.payload as Station);
      break;

    case 'station_deleted':
      h.handleWsDeleted((event.payload as { id: string }).id);
      break;

    case 'stations_simulated':
      console.log("SIMULATED PAYLOAD:", event.payload);
      h.handleWsSimulated(event.payload as Station[]);
      break;
  }
});

    const unsubStatus = wsManager.onStatus((connected) => {
      handlersRef.current.setWsConnected(connected);
    });

    return () => {
      unsubMessage();
      unsubStatus();
      wsManager.disconnect();
    };
  }, []);
}
