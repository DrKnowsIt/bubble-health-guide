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
    console.log('Sample API response item:', JSON.stringify(data.list?.[0], null, 2));

    const images: MedicalImage[] = [];
    
    if (data.list && data.list.length > 0) {
      for (const item of data.list.slice(0, maxResults)) {
        try {
          // Extract image information - NIH API provides different image URL formats
          let imageUrl = '';
          
          // Try different image URL formats from NIH API
          if (item.imgLarge) {
            imageUrl = `https://openi.nlm.nih.gov/imgs/512/${item.imgLarge}.jpg`;
          } else if (item.imgMedium) {
            imageUrl = `https://openi.nlm.nih.gov/imgs/512/${item.imgMedium}.jpg`;
          } else if (item.imgSmall) {
            imageUrl = `https://openi.nlm.nih.gov/imgs/512/${item.imgSmall}.jpg`;
          } else if (item.image) {
            // Fallback to direct image URL if available
            imageUrl = item.image;
          }
          
          if (imageUrl) {
            console.log(`Image URL for item ${item.uid}: ${imageUrl}`);
            images.push({
              id: item.uid || Math.random().toString(36).substr(2, 9),
              title: item.title || 'Medical Image',
              description: item.abstract || item.caption || 'Medical reference image',
              imageUrl: imageUrl,
              source: item.journal || 'NIH/NLM OpenI'
            });
          } else {
            console.log('No valid image URL found for item:', item.uid);
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
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        images: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});