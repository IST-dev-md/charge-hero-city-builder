// ==========================================
// Domain types
// ==========================================

export type StationStatus = 'available' | 'charging' | 'out_of_order';

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  status: StationStatus;
}

export interface CreateStationPayload {
  name: string;
  x: number;
  y: number;
}

export interface UpdateStationPayload {
  name?: string;
  x?: number;
  y?: number;
  status?: StationStatus;
}

// API error shape
export interface ApiError {
  status: number;
  message: string;
  data?: Record<string, unknown>;
}

// WebSocket event types
export type WsEventType =
  | 'station_created'
  | 'station_updated'
  | 'station_deleted'
  | 'stations_simulated';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
}

export interface WsStationCreated {
  type: 'station_created';
  payload: Station;
}

export interface WsStationUpdated {
  type: 'station_updated';
  payload: Station;
}

export interface WsStationDeleted {
  type: 'station_deleted';
  payload: { id: string };
}

export interface WsStationsSimulated {
  type: 'stations_simulated';
  payload: Station[];
}
