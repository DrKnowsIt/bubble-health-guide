import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MedicalImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
}

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

    console.log(`Searching for medical images: ${searchTerm}`);

    // Query NIH OpenNLM API for medical images
    const apiUrl = `https://openi.nlm.nih.gov/api/search?query=${encodeURIComponent(searchTerm)}&m=1&n=${maxResults}&it=ph,p,g&favor=r`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'HealthAI-Assistant/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`NIH API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch medical images', images: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`NIH API response: ${data.count} results found`);

    const images: MedicalImage[] = [];
    
    if (data.list && data.list.length > 0) {
      for (const item of data.list.slice(0, maxResults)) {
        try {
          // Extract image information
          const imageId = item.imgLarge || item.imgMedium || item.imgSmall;
          if (imageId) {
            images.push({
              id: item.uid || Math.random().toString(36).substr(2, 9),
              title: item.title || 'Medical Image',
              description: item.abstract || item.caption || 'Medical reference image',
              imageUrl: `https://openi.nlm.nih.gov/imgs/512/${imageId}`,
              source: item.journal || 'NIH/NLM OpenI'
            });
          }
        } catch (error) {
          console.error('Error processing image item:', error);
        }
      }
    }

    console.log(`Processed ${images.length} medical images`);

    return new Response(
      JSON.stringify({ 
        searchTerm,
        count: images.length,
        images 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in medical-image-search function:', error);
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