// ==========================================
// GridCell — single cell in the 40x20 grid
// Smart city visual: district borders, road axes, ground halos
// ==========================================

import { memo, useCallback, useMemo } from 'react';
import type { Station } from '@/domain/types';

interface GridCellProps {
  x: number;
  y: number;
  station?: Station;
  onEmptyClick: (x: number, y: number) => void;
  onStationClick: (station: Station) => void;
}

const STATUS_EMOJI: Record<string, string> = {
  available: '\u26A1',
  charging: '\uD83D\uDD0C',
  out_of_order: '\u26A0\uFE0F',
};

// Central road axes
const ROAD_COL = 20;
const ROAD_ROW = 10;

export const GridCell = memo(function GridCell({
  x,
  y,
  station,
  onEmptyClick,
  onStationClick,
}: GridCellProps) {
  const handleClick = useCallback(() => {
    if (station) {
      onStationClick(station);
    } else {
      onEmptyClick(x, y);
    }
  }, [station, x, y, onEmptyClick, onStationClick]);

  // Compute urban CSS classes based on position (pure math, no re-renders)
  const urbanClasses = useMemo(() => {
    const cls: string[] = ['grid-cell'];

    if (station) {
      cls.push('grid-cell--occupied');
    } else {
      cls.push('grid-cell--empty');
    }

    // District borders: every 5th cell marks a block boundary
    if ((x + 1) % 5 === 0 && x < 39) cls.push('grid-cell--district-right');
    if ((y + 1) % 5 === 0 && y < 19) cls.push('grid-cell--district-bottom');

    // District tint alternation (warm/cool quartiers)
    const districtCol = Math.floor(x / 5);
    const districtRow = Math.floor(y / 5);
    const isEvenDistrict = (districtCol + districtRow) % 2 === 0;
    cls.push(isEvenDistrict ? 'grid-cell--district-cool' : 'grid-cell--district-warm');

    // Main road axes
    const isRoadH = y === ROAD_ROW;
    const isRoadV = x === ROAD_COL;

    if (isRoadH && isRoadV) {
      cls.push('grid-cell--road-cross');
    } else if (isRoadH) {
      cls.push('grid-cell--road-h');
    } else if (isRoadV) {
      cls.push('grid-cell--road-v');
    }

    return cls.join(' ');
  }, [x, y, station]);

  return (
    <div
      className={urbanClasses}
      onClick={handleClick}
      title={station ? `${station.name} (${station.status})` : `(${x}, ${y})`}
    >
      {station && (
        <>
          {/* Ground halo under station */}
          <div className={`station-halo station-halo--${station.status}`} />

          <div className={`station-icon station-icon--${station.status}`}>
            {station.status === 'out_of_order' && (
              <>
                <span className="station-icon__smoke">{'\u2601'}</span>
                <span className="station-icon__smoke">{'\u2601'}</span>
                <span className="station-icon__smoke">{'\u2601'}</span>
              </>
            )}
            <span className="station-icon__emoji">
              {STATUS_EMOJI[station.status] || '\u26A1'}
            </span>
          </div>
        </>
      )}
    </div>
  );
});
