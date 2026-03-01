// ==========================================
// StationDetail — selected station info + edit + actions
// ==========================================

import { useState, useCallback, useEffect } from 'react';
import { useStationStore } from '@/store/useStationStore';
import type { Station, StationStatus, ApiError } from '@/domain/types';
import { toast } from 'sonner';

interface StationDetailProps {
  station: Station;
}

const STATUS_OPTIONS: { value: StationStatus; label: string; icon: string }[] = [
  { value: 'available', label: 'Disponible', icon: '⚡' },
  { value: 'charging', label: 'En charge', icon: '🔌' },
  { value: 'out_of_order', label: 'En panne', icon: '⚠️' },
];

export function StationDetail({ station }: StationDetailProps) {
  const updateStation = useStationStore((s) => s.updateStation);
  const deleteStation = useStationStore((s) => s.deleteStation);
  const repairStation = useStationStore((s) => s.repairStation);
  const selectStation = useStationStore((s) => s.selectStation);

  const [name, setName] = useState(station.name);
  const [status, setStatus] = useState<StationStatus>(station.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [nameError, setNameError] = useState('');

  // Sync local state when station changes from WS (only if not currently editing)
  useEffect(() => {
    if (!saving) {
      setName(station.name);
      setStatus(station.status);
    }
  }, [station.name, station.status, saving]);

  const isDirty = name !== station.name || status !== station.status;

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Le nom est obligatoire');
      return;
    }
    setNameError('');
    setSaving(true);

    const payload: Partial<{ name: string; status: StationStatus }> = {};
    if (trimmed !== station.name) payload.name = trimmed;
    if (status !== station.status) payload.status = status;

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      return;
    }

    try {
      await updateStation(station.id, payload);
      toast.success('Station mise à jour');
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 409) {
        setNameError('Ce nom est déjà utilisé');
      } else if (err.status === 404) {
        toast.error('Station introuvable');
        selectStation(null);
      } else {
        toast.error(err.message || 'Erreur mise à jour');
      }
    } finally {
      setSaving(false);
    }
  }, [name, status, station, updateStation, selectStation]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteStation(station.id);
      toast.success('Station supprimée');
      selectStation(null);
    } catch {
      // handled in store
    } finally {
      setDeleting(false);
    }
  }, [station.id, deleteStation, selectStation]);

  const handleRepair = useCallback(async () => {
    setRepairing(true);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await repairStation(station.id);
      toast.success('Borne réparée avec succès !');
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 404) {
        toast.error('Station introuvable');
        selectStation(null);
      } else {
        toast.error(err.message || 'Erreur réparation');
      }
    } finally {
      setRepairing(false);
    }
  }, [station.id, repairStation, selectStation]);

  return (
    <div className="station-detail">
      {/* Header with coords */}
      <div className="station-detail__header">
        <div className="station-detail__coords">
          📍 ({station.x}, {station.y})
        </div>
        <span className={`station-detail__status station-detail__status--${station.status}`}>
          {STATUS_OPTIONS.find((o) => o.value === station.status)?.label}
        </span>
      </div>

      {/* Editable name */}
      <div className="station-detail__field">
        <label className="station-detail__label">Nom</label>
        <input
          className={`station-detail__input ${nameError ? 'station-detail__input--error' : ''}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          placeholder="Nom de la station"
          disabled={saving}
        />
        {nameError && <span className="station-detail__error">{nameError}</span>}
      </div>

      {/* Status selector */}
      <div className="station-detail__field">
        <label className="station-detail__label">Statut</label>
        <div className="station-detail__status-selector">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`station-detail__status-option station-detail__status-option--${opt.value} ${
                status === opt.value ? 'station-detail__status-option--active' : ''
              }`}
              onClick={() => setStatus(opt.value)}
              disabled={saving}
              type="button"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="station-detail__actions">
        {isDirty && (
          <button
            className="sidebar-btn sidebar-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        )}

        {station.status === 'out_of_order' && (
          <button
            className="sidebar-btn sidebar-btn--primary"
            onClick={handleRepair}
            disabled={repairing || saving}
          >
            {repairing ? 'Réparation...' : '🔧 Réparer'}
          </button>
        )}

        <button
          className="sidebar-btn sidebar-btn--danger"
          onClick={handleDelete}
          disabled={deleting || saving}
        >
          {deleting ? 'Suppression...' : '🗑️ Supprimer'}
        </button>
      </div>

      {/* Repair progress bar */}
      {repairing && (
        <div className="station-repair-overlay" style={{ position: 'relative', marginTop: '12px', height: '6px', borderRadius: '3px', background: 'hsla(220, 15%, 18%, 0.5)' }}>
          <div className="station-repair-overlay__bar" style={{ '--repair-duration': '2s' } as React.CSSProperties} />
        </div>
      )}
    </div>
  );
}
