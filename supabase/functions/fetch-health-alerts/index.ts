import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  region: string;
  country: string;
  disease_type: string;
  recommendations: string[];
  source: string;
  published_at: string;
  expires_at?: string;
}

interface AlertRequest {
  region?: string;
  country?: string;
  include_travel_locations?: boolean;
  patient_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { region, country, include_travel_locations, patient_id }: AlertRequest = await req.json();

    console.log('Fetching health alerts for:', { region, country, include_travel_locations, patient_id });

    // Check cache first
    const cacheKey = `${region || 'global'}_${country || 'all'}`;
    const { data: cachedAlerts } = await supabase
      .from('health_alert_cache')
      .select('*')
      .eq('region', region || 'global')
      .eq('country', country || 'global')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedAlerts) {
      console.log('Returning cached alerts');
      return new Response(
        JSON.stringify({ 
          alerts: cachedAlerts.alerts,
          cached: true,
          cached_at: cachedAlerts.cached_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get patient's travel locations if requested
    let travelLocations: string[] = [];
    if (include_travel_locations && patient_id) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('recent_travel_locations, location_region, location_country')
        .eq('id', patient_id)
        .eq('user_id', user.id)
        .single();

      if (patientData) {
        if (patientData.recent_travel_locations) {
          travelLocations = patientData.recent_travel_locations;
        }
        if (patientData.location_country && !travelLocations.includes(patientData.location_country)) {
          travelLocations.push(patientData.location_country);
        }
      }
    }

    // Generate health alerts using AI based on location
    const locationsToCheck = [...new Set([
      country || 'global',
      ...travelLocations
    ])].filter(Boolean);

    console.log('Locations to check for alerts:', locationsToCheck);

    let alerts: HealthAlert[] = [];

    if (openaiApiKey && locationsToCheck.length > 0) {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const prompt = `You are a health alert system. Generate realistic, current health alerts for the following locations: ${locationsToCheck.join(', ')}.

Current date: ${currentDate}

For each location, provide 1-3 relevant health alerts based on typical seasonal health concerns, endemic diseases, or ongoing health situations. Include:
- Seasonal flu/respiratory illness warnings
- Vector-borne disease alerts (based on climate/season)
- Air quality or environmental health alerts
- Vaccination reminders
- Food/water safety advisories

Return a JSON array of alerts with this structure:
{
  "alerts": [
    {
      "id": "unique-id",
      "title": "Alert title",
      "description": "Detailed description",
      "severity": "low" | "medium" | "high" | "critical",
      "region": "specific region if applicable",
      "country": "country code",
      "disease_type": "category of health concern",
      "recommendations": ["action 1", "action 2"],
      "source": "Health authority source",
      "published_at": "ISO date",
      "expires_at": "ISO date or null"
    }
  ]
}

Make alerts relevant, actionable, and based on realistic health concerns. Include severity levels appropriately.`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a health information system that provides location-based health alerts. Always respond with valid JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            alerts = parsed.alerts || [];
            console.log(`Generated ${alerts.length} health alerts`);
          }
        } else {
          console.error('OpenAI API error:', await response.text());
        }
      } catch (aiError) {
        console.error('Error generating alerts:', aiError);
      }
    }

    // If no AI-generated alerts, provide fallback alerts
    if (alerts.length === 0) {
      alerts = generateFallbackAlerts(country || 'global', region);
    }

    // Cache the alerts (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('health_alert_cache')
      .upsert({
        region: region || 'global',
        country: country || 'global',
        alerts: alerts,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt
      }, {
        onConflict: 'region,country'
      });

    return new Response(
      JSON.stringify({ 
        alerts,
        cached: false,
        travel_locations_checked: travelLocations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-health-alerts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackAlerts(country: string, region?: string): HealthAlert[] {
  const currentDate = new Date().toISOString();
  const month = new Date().getMonth();
  
  const alerts: HealthAlert[] = [];
  
  // Seasonal flu alert (Oct-Mar in Northern Hemisphere)
  if (month >= 9 || month <= 2) {
    alerts.push({
      id: `flu-${country}-${Date.now()}`,
      title: 'Seasonal Flu Alert',
      description: 'Flu season is active in your area. Take precautions to protect yourself and others.',
      severity: 'medium',
      region: region || 'General',
      country: country,
      disease_type: 'Respiratory',
      recommendations: [
        'Get your annual flu vaccination',
        'Wash hands frequently',
        'Avoid close contact with sick individuals',
        'Stay home if you feel unwell'
      ],
      source: 'General Health Advisory',
      published_at: currentDate
    });
  }

  // General health advisory
  alerts.push({
    id: `general-${country}-${Date.now()}`,
    title: 'Stay Informed About Local Health',
    description: 'Monitor local health authority announcements for area-specific health advisories.',
    severity: 'low',
    region: region || 'General',
    country: country,
    disease_type: 'General',
    recommendations: [
      'Follow local health authority guidelines',
      'Keep vaccinations up to date',
      'Maintain good hygiene practices'
    ],
    source: 'General Health Advisory',
    published_at: currentDate
  });

  return alerts;
}
