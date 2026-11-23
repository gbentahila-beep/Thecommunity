/** Liens Google Maps sans clé : recherche du lieu, itinéraire, carte intégrée. */
export const mapsLinks = (name: string, address: string) => {
  const q = encodeURIComponent(`${name}, ${address}`);
  return {
    search: `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
  };
};
