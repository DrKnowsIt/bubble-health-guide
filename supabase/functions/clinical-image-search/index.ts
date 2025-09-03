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
  'bed bug': ['arthropod bite reaction', 'insect bite', 'bite reaction'],
  'flea': ['arthropod bite reaction', 'insect bite', 'flea bite'],
  'mosquito': ['arthropod bite reaction', 'insect bite', 'mosquito bite'],
  'spider': ['arthropod bite reaction', 'spider bite', 'bite reaction'],
  'rash': ['dermatitis', 'eczema', 'rash', 'inflammatory'],
  'acne': ['acne', 'comedone', 'pustule'],
  'mole': ['nevus', 'mole', 'melanocytic'],
  'wart': ['wart', 'verruca', 'viral'],
  'psoriasis': ['psoriasis', 'plaque', 'scaling'],
  'eczema': ['eczema', 'dermatitis', 'atopic'],
  'hives': ['urticaria', 'hives', 'wheals'],
  'burn': ['burn', 'thermal injury', 'scald']
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
    console.log(`Mapped search terms: ${mappedTerms.join(', ')}`);

    const images: ClinicalImage[] = [];

    // Try each mapped term until we get results
    for (const term of mappedTerms.slice(0, 2)) { // Limit to 2 terms to avoid too many requests
      try {
        const searchResults = await searchISICImages(term, maxResults);
        images.push(...searchResults);
        
        if (images.length >= maxResults) {
          break;
        }
      } catch (error) {
        console.error(`Error searching for term "${term}":`, error);
        continue;
      }
    }

    // If no results from ISIC, try a direct search
    if (images.length === 0) {
      try {
        const directResults = await searchISICImages(searchTerm, maxResults);
        images.push(...directResults);
      } catch (error) {
        console.error('Direct search also failed:', error);
      }
    }

    console.log(`Found ${images.length} clinical images`);

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
          images.push({
            id: item.id || Math.random().toString(36).substr(2, 9),
            title: item.diagnosis || item.meta?.clinical?.diagnosis || 'Clinical Image',
            description: buildDescription(item),
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

function buildDescription(item: any): string {
  const parts: string[] = [];
  
  if (item.diagnosis) {
    parts.push(`Diagnosis: ${item.diagnosis}`);
  }
  
  if (item.meta?.clinical?.age_approx) {
    parts.push(`Age: ~${item.meta.clinical.age_approx} years`);
  }
  
  if (item.meta?.clinical?.sex) {
    parts.push(`Sex: ${item.meta.clinical.sex}`);
  }
  
  if (item.meta?.clinical?.anatom_site_general) {
    parts.push(`Location: ${item.meta.clinical.anatom_site_general}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Clinical dermatology image from ISIC Archive';
}