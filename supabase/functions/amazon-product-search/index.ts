import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductResult {
  name: string;
  price: string;
  rating: number;
  amazonUrl: string;
  imageUrl: string;
  category: string;
}

interface ProductSearchRequest {
  solutionCategory: string;
  keywords: string[];
  maxResults?: number;
}

// Product mapping based on health solution categories
const categoryProductMappings: Record<string, string[]> = {
  'anxiety': ['pulse oximeter', 'stress ball', 'aromatherapy diffuser', 'herbal tea anxiety'],
  'heart': ['blood pressure monitor', 'pulse oximeter', 'heart rate monitor'],
  'sleep': ['sleep mask', 'white noise machine', 'melatonin', 'pillow sleep'],
  'stress': ['essential oils lavender', 'meditation cushion', 'stress relief tea', 'yoga mat'],
  'nutrition': ['multivitamin', 'water bottle with time markers', 'protein powder', 'omega 3'],
  'exercise': ['resistance bands', 'yoga mat', 'fitness tracker', 'foam roller'],
  'pain': ['heating pad', 'ice pack therapy', 'compression sleeve', 'massage roller'],
  'digestive': ['probiotics', 'digestive enzymes', 'peppermint tea', 'fiber supplement'],
  'respiratory': ['humidifier', 'air purifier', 'saline nasal spray', 'cough drops'],
  'skin': ['moisturizer sensitive skin', 'sunscreen SPF 50', 'aloe vera gel', 'vitamin E oil'],
  'mental_health': ['journal notebook', 'mindfulness book', 'meditation app subscription', 'stress relief coloring'],
  'general': ['first aid kit', 'thermometer digital', 'hand sanitizer', 'vitamin C']
};

// Mock Amazon product search - In reality, you'd use a service like ScraperAPI or SerpApi
async function searchAmazonProducts(category: string, keywords: string[], maxResults = 3): Promise<ProductResult[]> {
  console.log(`Searching for products in category: ${category} with keywords: ${keywords.join(', ')}`);
  
  // Get relevant search terms for the category
  const categoryTerms = categoryProductMappings[category] || categoryProductMappings['general'];
  const searchTerms = [...keywords, ...categoryTerms].slice(0, 3);
  
  // Mock product data - in real implementation, replace with actual Amazon search
  const mockProducts: ProductResult[] = [];
  
  for (const term of searchTerms) {
    const products = generateMockProducts(term, category);
    mockProducts.push(...products);
  }
  
  // Remove duplicates and limit results
  const uniqueProducts = mockProducts.filter((product, index, self) => 
    index === self.findIndex(p => p.name === product.name)
  );
  
  return uniqueProducts.slice(0, maxResults);
}

function generateMockProducts(searchTerm: string, category: string): ProductResult[] {
  // This would be replaced with actual Amazon product search
  const baseProducts: Record<string, Partial<ProductResult>> = {
    'pulse oximeter': {
      name: 'Fingertip Pulse Oximeter Blood Oxygen Saturation Monitor',
      price: '$19.99',
      rating: 4.3,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q1Q1Q1Q1L._AC_SL1500_.jpg'
    },
    'stress ball': {
      name: 'Stress Relief Squeeze Ball Set - Hand Exercise Therapy',
      price: '$12.99',
      rating: 4.5,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q2Q2Q2Q2L._AC_SL1500_.jpg'
    },
    'aromatherapy diffuser': {
      name: 'Essential Oil Diffuser Ultrasonic Aromatherapy Humidifier',
      price: '$29.99',
      rating: 4.4,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q3Q3Q3Q3L._AC_SL1500_.jpg'
    },
    'blood pressure monitor': {
      name: 'Automatic Upper Arm Blood Pressure Monitor Cuff',
      price: '$24.99',
      rating: 4.2,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q4Q4Q4Q4L._AC_SL1500_.jpg'
    },
    'sleep mask': {
      name: '3D Contoured Sleep Mask for Complete Darkness',
      price: '$14.99',
      rating: 4.6,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q5Q5Q5Q5L._AC_SL1500_.jpg'
    },
    'white noise machine': {
      name: 'Sound Machine White Noise Generator for Sleep',
      price: '$39.99',
      rating: 4.7,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q6Q6Q6Q6L._AC_SL1500_.jpg'
    },
    'multivitamin': {
      name: 'Daily Multivitamin for Adults - Essential Nutrients',
      price: '$16.99',
      rating: 4.3,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q7Q7Q7Q7L._AC_SL1500_.jpg'
    },
    'yoga mat': {
      name: 'Premium Exercise Yoga Mat Non-Slip Thick',
      price: '$22.99',
      rating: 4.5,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71Q8Q8Q8Q8L._AC_SL1500_.jpg'
    }
  };
  
  const product = baseProducts[searchTerm.toLowerCase()];
  if (product) {
    return [{
      name: product.name!,
      price: product.price!,
      rating: product.rating!,
      amazonUrl: `https://amazon.com/dp/B0${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      imageUrl: product.imageUrl!,
      category
    }];
  }
  
  // Generic fallback product
  return [{
    name: `${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} - Top Rated`,
    price: `$${(Math.random() * 50 + 10).toFixed(2)}`,
    rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
    amazonUrl: `https://amazon.com/dp/B0${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    imageUrl: 'https://via.placeholder.com/200x200?text=Product',
    category
  }];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionCategory, keywords, maxResults = 3 }: ProductSearchRequest = await req.json();
    
    console.log('Product search request:', { solutionCategory, keywords, maxResults });
    
    if (!solutionCategory) {
      throw new Error('Solution category is required');
    }
    
    const products = await searchAmazonProducts(solutionCategory, keywords || [], maxResults);
    
    console.log(`Found ${products.length} products for category: ${solutionCategory}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      products,
      category: solutionCategory 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in amazon-product-search function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      products: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});