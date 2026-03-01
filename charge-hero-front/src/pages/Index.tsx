// ==========================================
// Index page - Charge Hero City Builder
// ==========================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStationStore } from '@/store/useStationStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CityGrid } from '@/components/Grid/CityGrid';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { CreateStationModal } from '@/components/Modal/CreateStationModal';
import { http } from '@/api/http'; // adapte si besoin
import type { Station } from '@/domain/types';
import '@/styles/globals.scss';
import { stationsApi } from '@/api/stations';

const Index = () => {
  const fetchAll = useStationStore((s) => s.fetchAll);
  const selectStation = useStationStore((s) => s.selectStation);
  const stations = useStationStore((s) => s.stations);
  const loading = useStationStore((s) => s.loading);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createModal, setCreateModal] = useState<{ x: number; y: number } | null>(null);

  // WebSocket connection
  useWebSocket();

  // 
  useEffect(() => {
    const init = async () => {
      try {
        //await http('/api/stations/reset', { method: 'POST' });
        await fetchAll();
        await stationsApi.simulate();
      } catch (e) {
        console.error('Failed', e);
      }
    };

    init();
  }, [fetchAll]);

  // Map stations by coordinates for fast lookup
  const stationsByCoord = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach((s) => {
      map.set(`${s.x},${s.y}`, s);
    });
    return map;
  }, [stations]);

  const handleEmptyCellClick = useCallback(
    (x: number, y: number) => {
      const existing = stationsByCoord.get(`${x},${y}`);

      if (existing) {
        selectStation(existing.id);
        setSidebarOpen(true);
        return;
      }

      setCreateModal({ x, y });
    },
    [stationsByCoord, selectStation]
  );

  const handleStationClick = useCallback(
    (station: Station) => {
      selectStation(station.id);
      setSidebarOpen(true);
    },
    [selectStation]
  );

  return (
    <div className="app-layout">
      <div className="app-main">
        <header className="app-header">
          <div className="app-header__title">
            <span className="icon">{'\u26A1'}</span>
            Charge Hero - City Builder
          </div>

          <div className="app-header__actions">
            <button
              className="sidebar-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {sidebarOpen ? 'Masquer' : 'Dashboard'}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="grid-container">
            <p style={{ color: 'hsl(220, 10%, 55%)' }}>Chargement...</p>
          </div>
        ) : (
          <CityGrid
            onEmptyCellClick={handleEmptyCellClick}
            onStationClick={handleStationClick}
          />
        )}
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {createModal && (
        <CreateStationModal
          x={createModal.x}
          y={createModal.y}
          onClose={() => setCreateModal(null)}
        />
      )}
    </div>
  );
};

export default Index;