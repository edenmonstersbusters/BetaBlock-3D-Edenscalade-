
export const CLIMBING_STYLES = [
  'Dalle', 'Vertical', 'Dévers', 'Toit', 'Physique', 'Technique', 
  'Dynamique', 'Équilibre', 'Compression', 'Réglettes', 'Plats', 
  'Volumes', 'Pieds précis', 'No-hands', 'Run & Jump', 'Coordination', 
  'Endurance', 'Résistance', 'Highball', 'Traversée'
];

export const GRADES_FR = [
  '2', '3', '4', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', 
  '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', 
  '9a', '9a+', '9b', '9b+', '9c', '9c+'
];

export const GRADES_V = [
  'VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 
  'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
];

// Mapping approximatif pour la conversion auto
const FR_TO_V: Record<string, string> = {
  '2': 'VB', '3': 'VB', '4': 'VB', '5a': 'V0', '5b': 'V0', '5c': 'V1',
  '6a': 'V2', '6a+': 'V3', '6b': 'V4', '6b+': 'V4', '6c': 'V5', '6c+': 'V5',
  '7a': 'V6', '7a+': 'V7', '7b': 'V8', '7b+': 'V8', '7c': 'V9', '7c+': 'V10',
  '8a': 'V11', '8a+': 'V12', '8b': 'V13', '8b+': 'V14', '8c': 'V15', '8c+': 'V15',
  '9a': 'V16', '9a+': 'V17', '9b': 'V17'
};

const V_TO_FR: Record<string, string> = {
  'VB': '3', 'V0': '5b', 'V1': '5c', 'V2': '6a', 'V3': '6a+', 'V4': '6b',
  'V5': '6c', 'V6': '7a', 'V7': '7a+', 'V8': '7b', 'V9': '7c', 'V10': '7c+',
  'V11': '8a', 'V12': '8a+', 'V13': '8b', 'V14': '8b+', 'V15': '8c', 'V16': '9a', 'V17': '9a+'
};

export const convertGrade = (grade: string, from: 'FR' | 'V'): string => {
  if (from === 'FR') return FR_TO_V[grade] || 'V3';
  return V_TO_FR[grade] || '6a';
};

export const getGradeSortValue = (grade: string, type: 'FR' | 'V'): number => {
  const list = type === 'FR' ? GRADES_FR : GRADES_V;
  return list.indexOf(grade);
};
