/**
 * The tool rack — `available()`, turned into rows a person can read.
 *
 * The rule the whole panel wall lives by is enforced HERE, in one function: a
 * marker is rendered only when the session actually returned that field. An
 * absent `materialized` means "no live registrations anywhere, so the session
 * does not claim to know" — printing it as `false` would invent a fact. Each
 * marker's label is the field's own name, so a reader can go look it up.
 */
import type { AvailableEdge, AvailableSlice } from 'hcifootprint';

export interface Marker {
  /** The API field this chip came from. */
  readonly label: string;
  readonly value: string;
  /** Something the app is missing (renders as a warm chip), vs plain evidence. */
  readonly wanting?: boolean;
}

export interface RackRow {
  readonly id: string;
  readonly does: string;
  readonly role: string;
  readonly node: string | null;
  readonly markers: readonly Marker[];
}

export interface Rack {
  /** The call every row on this rack came from. */
  readonly from: 'available()';
  readonly node: string;
  readonly version: number;
  readonly rows: readonly RackRow[];
}

export function rackOf(slice: AvailableSlice): Rack {
  return {
    from: 'available()',
    node: slice.node,
    version: slice.version,
    rows: slice.edges.map(rowOf),
  };
}

function rowOf(edge: AvailableEdge): RackRow {
  const markers: Marker[] = [];
  if (edge.binding !== undefined) markers.push({ label: 'gesture', value: edge.binding.kind });
  if (edge.materialized !== undefined) {
    markers.push({
      label: 'materialized',
      value: String(edge.materialized),
      wanting: edge.materialized === false,
    });
  }
  if (edge.enabled !== undefined) {
    markers.push({ label: 'enabled', value: String(edge.enabled), wanting: edge.enabled === false });
  }
  if (edge.highEffect) markers.push({ label: 'highEffect', value: 'true' });
  if (edge.activation !== undefined) markers.push({ label: 'activation', value: edge.activation });
  if (edge.presence !== undefined) markers.push({ label: 'presence', value: edge.presence, wanting: true });
  if (edge.instances !== undefined) {
    markers.push({ label: 'instances', value: String(edge.instances.length) });
  }
  if (edge.enumeration !== undefined) {
    markers.push({
      label: 'enumeration',
      value: edge.enumeration,
      wanting: edge.enumeration === 'mounted-window',
    });
  }
  if (edge.guardUnevaluated !== undefined) {
    markers.push({ label: 'guardUnevaluated', value: edge.guardUnevaluated.join(', '), wanting: true });
  }
  if (edge.descriptionSource !== undefined) {
    markers.push({ label: 'descriptionSource', value: edge.descriptionSource });
  }
  return {
    id: edge.affordanceId,
    does: edge.description,
    role: edge.role,
    node: edge.node ?? null,
    markers,
  };
}
