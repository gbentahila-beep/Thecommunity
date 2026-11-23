/** Liens Google Maps sans clé : recherche du lieu, itinéraire, carte intégrée. */
/** Avec les coordonnées GPS du lieu, l'itinéraire et la carte pointent exactement sur l'entrée ; sinon, recherche par nom et adresse. */
export const mapsLinks = (name: string, address: string, geo?: { lat: number; lng: number } | null) => {
  const q = encodeURIComponent(`${name}, ${address}`);
  const point = geo ? `${geo.lat},${geo.lng}` : null;
  return {
    search: point ? `https://www.google.com/maps/search/?api=1&query=${point}` : `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: point ? `https://www.google.com/maps/dir/?api=1&destination=${point}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    embed: `https://www.google.com/maps?q=${point ?? q}&output=embed`,
  };
};
