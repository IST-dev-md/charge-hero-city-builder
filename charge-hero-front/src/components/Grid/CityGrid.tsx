// ==========================================
// CityGrid — 40×20 interactive grid
// ==========================================

import { useCallback, useMemo } from 'react';
import { GridCell } from './GridCell';
import { useStationStore } from '@/store/useStationStore';
import type { Station } from '@/domain/types';
import '@/styles/grid.scss';

const COLS = 40;
const ROWS = 20;

interface CityGridProps {
  onEmptyCellClick: (x: number, y: number) => void;
  onStationClick: (station: Station) => void;
}

export function CityGrid({ onEmptyCellClick, onStationClick }: CityGridProps) {
  const stations = useStationStore((s) => s.stations);

  // Build a lookup map for O(1) access by "x,y"
  const stationsByCoord = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach((s) => map.set(`${s.x},${s.y}`, s));
    return map;
  }, [stations]);

  const handleEmptyClick = useCallback(
    (x: number, y: number) => onEmptyCellClick(x, y),
    [onEmptyCellClick]
  );

  const handleStationClick = useCallback(
    (station: Station) => onStationClick(station),
    [onStationClick]
  );

  // Generate cells
  const cells = useMemo(() => {
    const result: JSX.Element[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const station = stationsByCoord.get(`${col},${row}`);
        result.push(
          <GridCell
            key={`${col}-${row}`}
            x={col}
            y={row}
            station={station}
            onEmptyClick={handleEmptyClick}
            onStationClick={handleStationClick}
          />
        );
      }
    }
    return result;
  }, [stationsByCoord, handleEmptyClick, handleStationClick]);

  return (
    <div className="grid-container">
      <div className="city-grid">{cells}</div>
    </div>
  );
}
