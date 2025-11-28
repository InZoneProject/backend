export function determineNewZoneById(
  currentZoneId: number | null,
  zoneFromId: number | null,
  zoneToId: number,
): number | null {
  if (zoneFromId === null) {
    return currentZoneId === zoneToId ? null : zoneToId;
  }

  if (currentZoneId === zoneToId) {
    return zoneFromId;
  }

  if (currentZoneId === zoneFromId) {
    return zoneToId;
  }

  return zoneToId;
}
