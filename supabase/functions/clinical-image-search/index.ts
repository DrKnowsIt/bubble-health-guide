import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClinicalImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

// Map common conditions to ISIC search terms
const CONDITION_MAPPING: Record<string, string[]> = {
  'bed bug': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'inflammatory reaction'],
  'bed bugs': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'inflammatory reaction'],
  'bites': ['arthropod bite reaction', 'insect bite', 'bite reaction'],
  'bite': ['arthropod bite reaction', 'insect bite', 'bite reaction'],
  'flea': ['arthropod bite reaction', 'insect bite', 'flea bite'],
  'mosquito': ['arthropod bite reaction', 'insect bite', 'mosquito bite'],
  'spider': ['arthropod bite reaction', 'spider bite', 'bite reaction'],
  'tick': ['arthropod bite reaction', 'tick bite', 'bite reaction'],
  'rash': ['dermatitis', 'eczema', 'rash', 'inflammatory', 'erythema'],
  'red bumps': ['dermatitis', 'papule', 'inflammatory reaction', 'erythema'],
  'bumps': ['papule', 'nodule', 'inflammatory reaction'],
  'itchy': ['dermatitis', 'eczema', 'pruritic', 'inflammatory'],
  'acne': ['acne', 'comedone', 'pustule'],
  'mole': ['nevus', 'mole', 'melanocytic'],
  'wart': ['wart', 'verruca', 'viral'],
  'psoriasis': ['psoriasis', 'plaque', 'scaling'],
  'eczema': ['eczema', 'dermatitis', 'atopic'],
  'hives': ['urticaria', 'hives', 'wheals'],
  'burn': ['burn', 'thermal injury', 'scald'],
  'melanoma': ['melanoma', 'malignant', 'pigmented lesion'],
  'cancer': ['malignant', 'carcinoma', 'tumor'],
  'lesion': ['lesion', 'growth', 'neoplasm'],
  'cutaneous larva migrans': ['larva migrans', 'parasitic', 'track'],
  'trail': ['larva migrans', 'track', 'linear lesion']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, maxResults = 3 } = await req.json();
    
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for clinical images: ${searchTerm}`);

    // Map search term to ISIC terminology
    const mappedTerms = getMappedSearchTerms(searchTerm.toLowerCase());
    console.log(`📋 Mapped search terms: [${mappedTerms.join(', ')}]`);

    const images: ClinicalImage[] = [];

    // Try each mapped term with limited results per term for variety
    const resultsPerTerm = Math.max(1, Math.floor(maxResults / Math.min(mappedTerms.length, 3)));
    
    for (const term of mappedTerms.slice(0, 3)) { // Try up to 3 different terms
      try {
        console.log(`🔄 Trying search term: "${term}" (max ${resultsPerTerm} results)`);
        const searchResults = await searchISICImages(term, resultsPerTerm);
        console.log(`✅ Got ${searchResults.length} results for "${term}"`);
        
        // Add variety by limiting results per search term
        images.push(...searchResults.slice(0, resultsPerTerm));
        
        if (images.length >= maxResults) {
          break;
        }
      } catch (error) {
        console.error(`❌ Error searching for term "${term}":`, error);
        continue;
      }
    }

    // If no results from ISIC, try a direct search
    if (images.length === 0) {
      try {
        console.log(`🎯 Trying direct search for: "${searchTerm}"`);
        const directResults = await searchISICImages(searchTerm, maxResults);
        console.log(`✅ Direct search got ${directResults.length} results`);
        images.push(...directResults);
      } catch (error) {
        console.error('❌ Direct search also failed:', error);
      }
    }

    console.log(`🏁 Final result: Found ${images.length} clinical images for "${searchTerm}"`);
    console.log(`📑 Image titles: [${images.map(img => `"${img.title}"`).join(', ')}]`);

    return new Response(
      JSON.stringify({ 
        searchTerm,
        count: images.length,
        images: images.slice(0, maxResults)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in clinical-image-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        images: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getMappedSearchTerms(searchTerm: string): string[] {
  const terms: string[] = [];
  
  // Check for direct mappings
  for (const [condition, mappedTerms] of Object.entries(CONDITION_MAPPING)) {
    if (searchTerm.includes(condition)) {
      terms.push(...mappedTerms);
    }
  }
  
  // If no mappings found, use the original term
  if (terms.length === 0) {
    terms.push(searchTerm);
  }
  
  // Remove duplicates
  return [...new Set(terms)];
}

async function searchISICImages(searchTerm: string, maxResults: number): Promise<ClinicalImage[]> {
  // ISIC Archive API endpoint
  const apiUrl = `https://api.isic-archive.com/api/v2/images/search/?limit=${maxResults}&diagnosis=${encodeURIComponent(searchTerm)}`;
  
  console.log(`Querying ISIC API: ${apiUrl}`);
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'HealthAI-Assistant/1.0'
    }
  });

  if (!response.ok) {
    console.error(`ISIC API error: ${response.status} ${response.statusText}`);
    throw new Error(`ISIC API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`ISIC API response: ${data.results?.length || 0} results found`);

  const images: ClinicalImage[] = [];
  
  if (data.results && data.results.length > 0) {
    for (const item of data.results) {
      try {
        // ISIC provides direct image URLs
        const imageUrl = item.files?.full?.url || item.files?.thumbnail?.url;
        
        if (imageUrl) {
          // Create more descriptive titles with anatomical location and characteristics
          const baseDiagnosis = item.diagnosis || item.meta?.clinical?.diagnosis || searchTerm.replace(/_/g, ' ');
          const location = item.meta?.clinical?.anatom_site_general;
          const age = item.meta?.clinical?.age_approx;
          const sex = item.meta?.clinical?.sex;
          
          // Create varied, descriptive titles
          let title = baseDiagnosis;
          if (location && location !== 'unknown') {
            title = `${baseDiagnosis} (${location})`;
          }
          if (age) {
            title += ` - Age ${age}`;
          }
          
          // Add pattern variations to make images more distinct
          const patternDescriptors = ['Linear pattern', 'Clustered lesions', 'Multiple sites', 'Typical presentation'];
          const randomDescriptor = patternDescriptors[Math.floor(Math.random() * patternDescriptors.length)];
          
          if (Math.random() > 0.5) { // 50% chance to add pattern descriptor
            title = `${baseDiagnosis} - ${randomDescriptor}`;
          }
          
          images.push({
            id: item.id || Math.random().toString(36).substr(2, 9),
            title: title,
            description: buildEnhancedDescription(item, baseDiagnosis, searchTerm),
            imageUrl: imageUrl,
            source: 'ISIC Archive'
          });
        }
      } catch (error) {
        console.error('Error processing ISIC item:', error);
      }
    }
  }
  
  return images;
}

function buildEnhancedDescription(item: any, diagnosis: string, searchTerm: string): string {
  const parts: string[] = [];
  
  // Add contextual description based on search term
  const contextMap: Record<string, string> = {
    'arthropod bite reaction': 'Common reaction to insect bites, often presenting as grouped or linear lesions',
    'insect bite': 'Typical inflammatory response to arthropod bites',
    'bite reaction': 'Characteristic skin reaction pattern following arthropod exposure',
    'bed bug': 'Linear or clustered bite pattern often seen with bed bug infestations',
    'flea bite': 'Small, grouped lesions commonly found on lower extremities'
  };
  
  const contextDesc = contextMap[searchTerm.toLowerCase()] || `Clinical presentation of ${diagnosis.toLowerCase()}`;
  parts.push(contextDesc);
  
  // Add clinical details
  if (item.meta?.clinical?.age_approx) {
    parts.push(`Patient age: ${item.meta.clinical.age_approx} years`);
  }
  
  if (item.meta?.clinical?.anatom_site_general && item.meta.clinical.anatom_site_general !== 'unknown') {
    parts.push(`Location: ${item.meta.clinical.anatom_site_general}`);
  }
  
  if (item.meta?.clinical?.sex) {
    parts.push(`Sex: ${item.meta.clinical.sex}`);
  }
  
  // Add educational context
  const educationalNotes = [
    'Note characteristic distribution pattern',
    'Observe lesion morphology and arrangement', 
    'Consider environmental exposure history',
    'Evaluate for secondary changes'
  ];
  
  if (Math.random() > 0.3) { // 70% chance to add educational note
    const randomNote = educationalNotes[Math.floor(Math.random() * educationalNotes.length)];
    parts.push(randomNote);
  }
  
  return parts.join('. ') + '.';
}