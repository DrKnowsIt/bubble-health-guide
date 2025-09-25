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

// Enhanced condition mapping with multiple diverse search terms and rotation
const CONDITION_MAPPING: Record<string, string[]> = {
  'bed bug': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'papular urticaria', 'flea bite', 'bedbug dermatitis'],
  'bed bugs': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'papular urticaria', 'flea bite', 'bedbug dermatitis'],
  'bites': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'papular urticaria', 'inflammatory reaction', 'pruritic papule'],
  'bite': ['arthropod bite reaction', 'insect bite', 'bite reaction', 'papular urticaria', 'inflammatory reaction', 'pruritic papule'],
  'flea': ['arthropod bite reaction', 'insect bite', 'flea bite', 'papular urticaria', 'pruritic lesion'],
  'mosquito': ['arthropod bite reaction', 'insect bite', 'mosquito bite', 'papular urticaria', 'wheals'],
  'spider': ['arthropod bite reaction', 'spider bite', 'bite reaction', 'necrotic arachnidism', 'inflammatory reaction'],
  'tick': ['arthropod bite reaction', 'tick bite', 'bite reaction', 'erythema migrans', 'inflammatory reaction'],
  'rash': ['dermatitis', 'eczema', 'rash', 'inflammatory', 'erythema', 'contact dermatitis', 'atopic dermatitis', 'seborrheic dermatitis'],
  'dermatitis': ['dermatitis', 'contact dermatitis', 'atopic dermatitis', 'seborrheic dermatitis', 'allergic dermatitis', 'eczema', 'inflammatory dermatosis'],
  'red bumps': ['dermatitis', 'papule', 'inflammatory reaction', 'erythema', 'folliculitis', 'papular lesion'],
  'bumps': ['papule', 'nodule', 'inflammatory reaction', 'folliculitis', 'keratosis pilaris', 'comedone'],
  'itchy': ['dermatitis', 'eczema', 'pruritic', 'inflammatory', 'atopic dermatitis', 'urticaria', 'prurigo'],
  'acne': ['acne', 'comedone', 'pustule', 'acne vulgaris', 'inflammatory acne', 'papulopustular'],
  'mole': ['nevus', 'mole', 'melanocytic', 'pigmented lesion', 'dysplastic nevus', 'congenital nevus'],
  'wart': ['wart', 'verruca', 'viral', 'verruca vulgaris', 'plantar wart', 'condyloma'],
  'psoriasis': ['psoriasis', 'plaque', 'scaling', 'psoriatic lesion', 'chronic dermatitis', 'inflammatory'],
  'eczema': ['eczema', 'dermatitis', 'atopic', 'atopic dermatitis', 'chronic eczema', 'inflammatory dermatosis'],
  'hives': ['urticaria', 'hives', 'wheals', 'angioedema', 'allergic reaction', 'pruritic wheals'],
  'burn': ['burn', 'thermal injury', 'scald', 'chemical burn', 'sunburn', 'erythema'],
  'melanoma': ['melanoma', 'malignant', 'pigmented lesion', 'malignant melanoma', 'skin cancer', 'atypical nevus'],
  'cancer': ['malignant', 'carcinoma', 'tumor', 'basal cell carcinoma', 'squamous cell carcinoma', 'skin cancer'],
  'lesion': ['lesion', 'growth', 'neoplasm', 'benign lesion', 'skin lesion', 'dermatofibroma'],
  'cutaneous larva migrans': ['larva migrans', 'parasitic', 'track', 'creeping eruption', 'linear lesion'],
  'trail': ['larva migrans', 'track', 'linear lesion', 'creeping eruption', 'serpiginous track']
};

// Cache to track used images and ensure rotation
const IMAGE_CACHE: Record<string, string[]> = {};

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

    // Map search term to diverse medical terminology
    const mappedTerms = getMappedSearchTerms(searchTerm.toLowerCase());
    console.log(`📋 Mapped search terms: [${mappedTerms.join(', ')}]`);

    const images: ClinicalImage[] = [];
    const cacheKey = searchTerm.toLowerCase();
    
    // Initialize cache for this term if not exists
    if (!IMAGE_CACHE[cacheKey]) {
      IMAGE_CACHE[cacheKey] = [];
    }

    // Try multiple approaches: ISIC API + NIH OpenNLM for variety
    const allSources = [
      { type: 'isic', terms: mappedTerms.slice(0, 4) }, // Try 4 different ISIC terms
      { type: 'nih', terms: [searchTerm, ...mappedTerms.slice(0, 2)] } // Try NIH with original + 2 mapped terms
    ];

    for (const source of allSources) {
      for (const term of source.terms) {
        if (images.length >= maxResults) break;
        
        try {
          console.log(`🔄 Trying ${source.type.toUpperCase()} with term: "${term}"`);
          
          let searchResults: ClinicalImage[] = [];
          if (source.type === 'isic') {
            searchResults = await searchISICImages(term, 2); // Max 2 per term for variety
          } else if (source.type === 'nih') {
            searchResults = await searchNIHImages(term, 2);
          }
          
          // Filter out previously shown images
          let filteredImages = searchResults.filter(img => !IMAGE_CACHE[cacheKey].includes(img.imageUrl));
          
          console.log(`✅ Got ${searchResults.length} total, ${filteredImages.length} new filtered results for "${term}"`);
          images.push(...filteredImages);
          
          // Update cache with new images
          filteredImages.forEach(img => IMAGE_CACHE[cacheKey].push(img.imageUrl));
          
        } catch (error) {
          console.error(`❌ Error searching ${source.type.toUpperCase()} for term "${term}":`, error);
          continue;
        }
      }
    }

    // If still no results, try broader fallback terms
    if (images.length === 0) {
      console.log(`🔄 No images found, trying broader fallback terms for: "${searchTerm}"`);
      
      const fallbackTerms = [];
      if (searchTerm.toLowerCase().includes('bite') || searchTerm.toLowerCase().includes('arthropod')) {
        fallbackTerms.push('bite', 'lesion', 'rash');
      } else if (searchTerm.toLowerCase().includes('dermatitis') || searchTerm.toLowerCase().includes('eczema')) {
        fallbackTerms.push('dermatitis', 'eczema', 'inflammatory');
      } else {
        fallbackTerms.push('lesion', 'rash', 'dermatitis');
      }
      
      for (const fallbackTerm of fallbackTerms) {
        if (images.length >= maxResults) break;
        
        try {
          console.log(`🎯 Trying fallback term: "${fallbackTerm}"`);
          const fallbackResults = await searchISICImages(fallbackTerm, 2);
          console.log(`✅ Fallback got ${fallbackResults.length} results for "${fallbackTerm}"`);
          
          // Filter out cached images
          const newFallbackImages = fallbackResults.filter(img => !IMAGE_CACHE[cacheKey].includes(img.imageUrl));
          images.push(...newFallbackImages);
          newFallbackImages.forEach(img => IMAGE_CACHE[cacheKey].push(img.imageUrl));
          
          if (images.length > 0) break; // Stop after finding some images
        } catch (error) {
          console.error(`❌ Fallback term "${fallbackTerm}" also failed:`, error);
        }
      }
    }

    // Original retry logic if cache clearing is needed
    if (images.length === 0 && IMAGE_CACHE[cacheKey].length > 0) {
      console.log(`🔄 No new images found, clearing cache and retrying...`);
      IMAGE_CACHE[cacheKey] = [];
      
      try {
        console.log(`🎯 Retry: searching ISIC for: "${searchTerm}"`);
        const retryResults = await searchISICImages(searchTerm, maxResults);
        console.log(`✅ Retry got ${retryResults.length} results`);
        images.push(...retryResults);
      } catch (error) {
        console.error('❌ Retry search also failed:', error);
      }
    }

    // Shuffle results for additional variety
    const shuffledImages = shuffleArray(images);
    
    // Trim cache if it gets too large (keep last 50 URLs)
    if (IMAGE_CACHE[cacheKey].length > 50) {
      IMAGE_CACHE[cacheKey] = IMAGE_CACHE[cacheKey].slice(-30);
    }

    console.log(`🏁 Final result: Found ${shuffledImages.length} clinical images for "${searchTerm}"`);
    console.log(`📑 Image titles: [${shuffledImages.map(img => `"${img.title}"`).join(', ')}]`);
    console.log(`💾 Cache status: ${IMAGE_CACHE[cacheKey].length} images cached for future rotation`);

    return new Response(
      JSON.stringify({ 
        searchTerm,
        count: shuffledImages.length,
        images: shuffledImages.slice(0, maxResults),
        cached: IMAGE_CACHE[cacheKey].length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in clinical-image-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error occurred',
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
  
  // Add partial matches for better coverage
  const partialMatches = ['bite', 'lesion', 'rash', 'dermatitis', 'eczema', 'inflammatory', 'reaction'];
  if (terms.length === 0) {
    // If no direct mapping, try related terms
    if (searchTerm.includes('bite') || searchTerm.includes('sting') || searchTerm.includes('arthropod')) {
      terms.push('bite', 'lesion', 'rash', 'inflammatory');
    } else if (searchTerm.includes('skin') || searchTerm.includes('red') || searchTerm.includes('irritat')) {
      terms.push(...partialMatches.slice(0, 3));
    }
    terms.push(searchTerm);
  }
  
  // Remove duplicates and shuffle for variety
  const uniqueTerms = [...new Set(terms)];
  return shuffleArray(uniqueTerms);
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

// Add NIH OpenNLM API search for additional variety
async function searchNIHImages(searchTerm: string, maxResults: number): Promise<ClinicalImage[]> {
  console.log(`🔍 NIH OpenNLM search for: ${searchTerm}`);
  
  try {
    const response = await fetch('https://api.nlm.nih.gov/medlineplus/v2/search', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HealthAI-Assistant/1.0'
      }
    });
    
    // For now, return empty array as NIH API has different structure
    // This is a placeholder for future NIH integration
    console.log('🔄 NIH API integration - placeholder (returning empty for now)');
    return [];
    
  } catch (error) {
    console.error('❌ NIH API error:', error);
    return [];
  }
}

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildEnhancedDescription(item: any, diagnosis: string, searchTerm: string): string {
  const parts: string[] = [];
  
  // Add contextual description based on medical specialty and condition
  const contextMap: Record<string, string> = {
    // Dermatology
    'dermatitis': 'Inflammatory skin condition with characteristic erythema and scaling patterns',
    'eczema': 'Chronic inflammatory dermatosis with typical morphology and distribution',
    'rash': 'Generalized skin eruption requiring clinical correlation and evaluation',
    'lesion': 'Localized pathological change in tissue structure',
    
    // Cardiology
    'myocardial infarction': 'Acute coronary syndrome with myocardial necrosis',
    'heart attack': 'Acute coronary event requiring immediate medical evaluation',
    'arrhythmia': 'Abnormal heart rhythm pattern requiring ECG correlation',
    
    // Pulmonology
    'pneumonia': 'Inflammatory pulmonary infection with consolidation pattern',
    'asthma': 'Chronic airway inflammatory condition with bronchial hyperreactivity',
    'copd': 'Chronic obstructive pulmonary disease with airflow limitation',
    
    // Ophthalmology
    'conjunctivitis': 'Inflammatory condition of the conjunctival membrane',
    'retinopathy': 'Pathological changes in retinal vasculature and structure',
    
    // Orthopedics
    'fracture': 'Disruption in bone cortical continuity requiring imaging correlation',
    'arthritis': 'Joint inflammatory process with structural changes',
    
    // Gastroenterology  
    'ulcer': 'Mucosal defect extending into deeper tissue layers',
    'colitis': 'Inflammatory bowel condition with mucosal involvement',
    
    // Neurology
    'stroke': 'Cerebrovascular accident with potential neurological deficits',
    'seizure': 'Abnormal electrical brain activity requiring neurological assessment',
    
    // Oncology
    'tumor': 'Abnormal tissue growth requiring histopathological evaluation',
    'cancer': 'Malignant neoplastic process with metastatic potential'
  };
  
  // Find best matching description
  let contextDesc = `Clinical presentation of ${diagnosis.toLowerCase()}`;
  for (const [key, desc] of Object.entries(contextMap)) {
    if (searchTerm.toLowerCase().includes(key) || diagnosis.toLowerCase().includes(key)) {
      contextDesc = desc;
      break;
    }
  }
  parts.push(contextDesc);
  
  // Add clinical details with variation
  const clinicalDetails = [];
  if (item.meta?.clinical?.age_approx) {
    clinicalDetails.push(`Age: ${item.meta.clinical.age_approx}y`);
  }
  
  if (item.meta?.clinical?.anatom_site_general && item.meta.clinical.anatom_site_general !== 'unknown') {
    clinicalDetails.push(`Site: ${item.meta.clinical.anatom_site_general}`);
  }
  
  if (item.meta?.clinical?.sex) {
    clinicalDetails.push(`${item.meta.clinical.sex}`);
  }
  
  if (clinicalDetails.length > 0) {
    parts.push(`[${clinicalDetails.join(', ')}]`);
  }
  
  // Add educational context with more variety across specialties
  const educationalNotes = [
    'Note characteristic distribution and morphology',
    'Observe lesion size, shape, and arrangement patterns', 
    'Consider differential diagnoses and clinical correlation',
    'Evaluate for associated symptoms and history',
    'Assessment requires professional medical evaluation',
    'Compare with patient presentation and clinical findings',
    'Review anatomical landmarks and tissue characteristics',
    'Consider pathophysiology and disease progression',
    'Correlate with laboratory and imaging findings',
    'Assess severity and staging criteria'
  ];
  
  if (Math.random() > 0.4) { // 60% chance to add educational note
    const randomNote = educationalNotes[Math.floor(Math.random() * educationalNotes.length)];
    parts.push(randomNote);
  }
  
  return parts.join('. ') + '.';
}