
import { BetaBlockFile } from '../types';

export const validateBetaBlockJson = (json: any): BetaBlockFile | null => {
  if (!json || typeof json !== 'object') return null;
  if (!json.version || !json.config || !Array.isArray(json.holds)) return null;
  
  const config = json.config;
  if (typeof config.width !== 'number' || !Array.isArray(config.segments)) return null;
  
  for (const seg of config.segments) {
    if (!seg.id || typeof seg.height !== 'number' || typeof seg.angle !== 'number') return null;
  }
  
  for (const hold of json.holds) {
    if (!hold.id || !hold.segmentId || typeof hold.x !== 'number' || typeof hold.y !== 'number') return null;
    
    // Vérification basique des limites (optionnel mais recommandé pour éviter les bugs visuels)
    const segment = config.segments.find((s: any) => s.id === hold.segmentId);
    if (!segment || hold.y > segment.height || Math.abs(hold.x) > config.width / 2) {
      console.warn(`Validation: Prise ${hold.id} hors limites.`);
    }
  }
  
  return json as BetaBlockFile;
};
