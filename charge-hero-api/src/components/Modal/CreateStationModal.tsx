// ==========================================
// CreateStationModal
// ==========================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStationStore } from '@/store/useStationStore';
import type { ApiError } from '@/domain/types';
import { toast } from 'sonner';
import '@/styles/modal.scss';

interface CreateStationModalProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function CreateStationModal({ x, y, onClose }: CreateStationModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createStation = useStationStore((s) => s.createStation);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();

      if (!trimmed) {
        setError('Le nom est obligatoire');
        inputRef.current?.focus();
        return;
      }

      setSubmitting(true);
      setError('');

      try {
        await createStation(trimmed, x, y);
        toast.success(`Borne "${trimmed}" creee en (${x}, ${y}) !`);
        onClose();
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 409) {
          setError('Ce nom est deja utilise');
          inputRef.current?.focus();
        } else if (err.status === 422) {
          setError(err.message || 'Donnees invalides');
          inputRef.current?.focus();
        } else {
          toast.error(err.message || 'Erreur serveur');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [name, x, y, createStation, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <form className="modal" onSubmit={handleSubmit}>
        <h2 className="modal__title">Nouvelle Station</h2>
        <p className="modal__subtitle">
          Position : ({x}, {y})
        </p>

        <div className="modal__field">
          <label htmlFor="station-name">Nom de la borne</label>
          <input
            ref={inputRef}
            id="station-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ex: Station Alpha"
            className={error ? 'input--error' : ''}
            disabled={submitting}
            autoComplete="off"
          />
          {error && <p className="modal__error">{error}</p>}
        </div>

        <div className="modal__actions">
          <button
            type="button"
            className="modal__btn modal__btn--cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="modal__btn modal__btn--confirm"
            disabled={submitting}
          >
            {submitting ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </form>
    </div>
  );
}
