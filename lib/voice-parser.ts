/**
 * Voice Parser - Extracts structured data from speech transcripts
 * Designed for bilingual Tagalog/English fisheries reporting
 */

export interface ParsedCatchData {
  species?: string
  weight?: string
  processingMethod?: string
  location?: string
  confidence: number
}

// Fish species mappings (Tagalog -> English -> Internal value)
const SPECIES_MAPPINGS: Record<string, string> = {
  // Tagalog names
  'bangus': 'bangus',
  'tilapia': 'tilapia',
  'lapu': 'lapu-lapu',
  'lapu-lapu': 'lapu-lapu',
  'grouper': 'lapu-lapu',
  'malipong': 'malipong-bato',
  'malipong bato': 'malipong-bato',
  'rabbitfish': 'malipong-bato',
  'dilis': 'dilis',
  'anchovy': 'dilis',
  'anchovies': 'dilis',
  'sardinas': 'sardinas',
  'sardine': 'sardinas',
  'sardines': 'sardinas',
  'tamban': 'tamban',
  'herring': 'tamban',
  'tunog': 'tunog',
  'fusilier': 'tunog',
  'taba': 'taba',
  'bigeye': 'taba',
  'bigeye tuna': 'taba',
  'bariles': 'bariles',
  'trevally': 'bariles',
  'isda ng bakal': 'isda-ng-bakal',
  'mackerel': 'isda-ng-bakal',
  'tunarya': 'tuna',
  'tuna': 'tuna',
  'pampanito': 'pampanito',
  'pompano': 'pampanito',
}

// Processing method mappings
const PROCESSING_MAPPINGS: Record<string, string> = {
  'sariwa': 'fresh',
  'sariwang isda': 'fresh',
  'fresh': 'fresh',
  'tinapa': 'smoked',
  'smoked': 'smoked',
  'tuyo': 'dried',
  'dried': 'dried',
  'tuyong': 'dried',
  'daing': 'salted',
  'salted': 'salted',
  'sardinas': 'canned',
  'canned': 'canned',
  'canned sardines': 'canned',
  'iba': 'other',
  'others': 'other',
}

// Location mappings (Olongapo City area)
const LOCATION_MAPPINGS: Record<string, string> = {
  'banicain': 'Banicain',
  'barretto': 'Barretto',
  'bareto': 'Barretto',
  'kalaklan': 'Kalaklan',
  'calaclan': 'Kalaklan',
  'olongapo': 'Olongapo City',
  'olongapo city': 'Olongapo City',
  'subic': 'Subic Municipality',
  'subic municipality': 'Subic Municipality',
  'mariveles': 'Mariveles',
  'bataan': 'Bataan',
}

export function parseTranscript(transcript: string): ParsedCatchData {
  const text = transcript.toLowerCase().trim()
  const result: ParsedCatchData = {
    confidence: 0
  }

  let matchCount = 0

  // Parse species
  for (const [keyword, value] of Object.entries(SPECIES_MAPPINGS)) {
    if (text.includes(keyword)) {
      result.species = value
      matchCount++
      break // Only match first species
    }
  }

  // Parse processing method
  for (const [keyword, value] of Object.entries(PROCESSING_MAPPINGS)) {
    if (text.includes(keyword)) {
      result.processingMethod = value
      matchCount++
      break // Only match first processing method
    }
  }

  // Parse location
  for (const [keyword, value] of Object.entries(LOCATION_MAPPINGS)) {
    if (text.includes(keyword)) {
      result.location = value
      matchCount++
      break // Only match first location
    }
  }

  // Parse weight (kg)
  const weightPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogram|kilograms)/i,
    /(\d+(?:\.\d+)?)\s*(?:kgs)/i,
    /(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?)/i, // Also support pounds
  ]

  for (const pattern of weightPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let weight = parseFloat(match[1])
      // Convert pounds to kg if needed
      if (pattern.toString().includes('pound')) {
        weight = weight * 0.453592
      }
      result.weight = weight.toFixed(2)
      matchCount++
      break
    }
  }

  // Calculate confidence based on number of fields matched
  result.confidence = Math.min(matchCount / 4, 1) // 4 fields max

  return result
}

/**
 * Format parsed data for display
 */
export function formatParsedData(data: ParsedCatchData): string {
  const parts: string[] = []

  if (data.species) {
    parts.push(`Species: ${data.species}`)
  }
  if (data.weight) {
    parts.push(`Weight: ${data.weight} kg`)
  }
  if (data.processingMethod) {
    parts.push(`Processing: ${data.processingMethod}`)
  }
  if (data.location) {
    parts.push(`Location: ${data.location}`)
  }

  return parts.join(', ') || 'No data detected'
}

/**
 * Get helpful suggestions based on what was detected
 */
export function getSuggestions(data: ParsedCatchData): string[] {
  const suggestions: string[] = []

  if (!data.species) {
    suggestions.push('Try saying the fish name (e.g., "Bangus", "Tilapia", "Lapu-lapu")')
  }
  if (!data.weight) {
    suggestions.push('Include the weight (e.g., "5 kilos", "10 kg")')
  }
  if (!data.processingMethod) {
    suggestions.push('Mention processing (e.g., "sariwa", "tinapa", "tuyo")')
  }
  if (!data.location) {
    suggestions.push('Say your location (e.g., "Banicain", "Barretto")')
  }

  return suggestions
}
