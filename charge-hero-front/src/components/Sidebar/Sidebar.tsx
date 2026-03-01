// ==========================================
// Sidebar — stats, detail, actions
// ==========================================

import { useState, useCallback, useMemo } from 'react';
import { useStationStore } from '@/store/useStationStore';
import { StationDetail } from '@/components/StationDetail/StationDetail';
import '@/styles/sidebar.scss';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const stations = useStationStore((s) => s.stations);
  const selectedId = useStationStore((s) => s.selectedId);
  const simulate = useStationStore((s) => s.simulate);
  const wsConnected = useStationStore((s) => s.wsConnected);
  const [simulating, setSimulating] = useState(false);

  const stats = useMemo(() => {
    let available = 0, charging = 0, outOfOrder = 0;
    stations.forEach((s) => {
      if (s.status === 'available') available++;
      else if (s.status === 'charging') charging++;
      else outOfOrder++;
    });
    const total = stations.size;
    const energyScore = available * 2 + charging * 1 + outOfOrder * -2;
    return { total, available, charging, outOfOrder, energyScore };
  }, [stations]);

  const selected = useMemo(() => {
    if (!selectedId) return undefined;
    return stations.get(selectedId);
  }, [stations, selectedId]);

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    await simulate();
    setSimulating(false);
  }, [simulate]);

  if (!open) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2>Dashboard</h2>
        <button className="sidebar__close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sidebar__content">
        {/* WS Status */}
        <div className={`ws-indicator ${wsConnected ? 'ws-indicator--live' : 'ws-indicator--offline'}`}>
          <span className="ws-indicator__dot" />
          {wsConnected ? 'Live' : 'Offline'}
        </div>

        {/* Stats */}
        <div className="stats-panel">
          <div className="stat-card stat-card--total">
            <div className="stat-card__icon">{'\uD83C\uDFD7\uFE0F'}</div>
            <div className="stat-card__info">
              <div className="stat-card__label">Total Stations</div>
              <div className="stat-card__value">{stats.total}</div>
            </div>
          </div>

          <div className="stat-card stat-card--available">
            <div className="stat-card__icon">{'\u26A1'}</div>
            <div className="stat-card__info">
              <div className="stat-card__label">Disponible</div>
              <div className="stat-card__value">{stats.available}</div>
            </div>
          </div>

          <div className="stat-card stat-card--charging">
            <div className="stat-card__icon">{'\uD83D\uDD0C'}</div>
            <div className="stat-card__info">
              <div className="stat-card__label">En charge</div>
              <div className="stat-card__value">{stats.charging}</div>
            </div>
          </div>

          <div className="stat-card stat-card--out_of_order">
            <div className="stat-card__icon">{'\u26A0\uFE0F'}</div>
            <div className="stat-card__info">
              <div className="stat-card__label">En panne</div>
              <div className="stat-card__value">{stats.outOfOrder}</div>
            </div>
          </div>

          <div className="stat-card stat-card--energy">
            <div className="stat-card__icon">{'\uD83D\uDD0B'}</div>
            <div className="stat-card__info">
              <div className="stat-card__label">Score Energie</div>
              <div className="stat-card__value">{stats.energyScore}</div>
            </div>
          </div>
        </div>

        {/* Simulate button */}
        <button
          className="sidebar-btn sidebar-btn--simulate"
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating ? 'Simulation...' : '\u26A1 Simuler'}
        </button>

        {/* Selected station detail */}
        {selected && <StationDetail station={selected} />}
      </div>
    </aside>
  );
}
