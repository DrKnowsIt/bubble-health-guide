import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id } = await req.json();
    console.log(`Generating comprehensive health report for user: ${user.id}, patient: ${patient_id || 'self'}`);

    // Get patient demographics
    let patientData = null;
    if (patient_id) {
      const { data: patient, error: patientError } = await supabaseClient
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        console.error('Error fetching patient:', patientError);
        return new Response(JSON.stringify({ error: 'Patient not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      patientData = patient;
    } else {
      // Get user profile for self
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        patientData = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          date_of_birth: profile.date_of_birth,
          gender: null
        };
      }
    }

    // Fetch all health records for this patient/user
    const { data: healthRecords, error: recordsError } = await supabaseClient
      .from('health_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('patient_id', patient_id || null)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Error fetching health records:', recordsError);
      return new Response(JSON.stringify({ error: 'Error fetching health records' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!healthRecords || healthRecords.length === 0) {
      console.log('No health records found');
      return new Response(JSON.stringify({ message: 'No health records to analyze' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate age if date of birth is available
    let age = null;
    if (patientData?.date_of_birth) {
      const birthDate = new Date(patientData.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Prepare context for AI analysis
    const patientContext = {
      name: patientData ? `${patientData.first_name} ${patientData.last_name}` : 'Patient',
      age: age,
      gender: patientData?.gender || 'Not specified',
      totalRecords: healthRecords.length
    };

    // Group records by type for better analysis
    const recordsByType = healthRecords.reduce((acc, record) => {
      const type = record.record_type || 'general';
      if (!acc[type]) acc[type] = [];
      acc[type].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    // Prepare data for AI analysis
    const healthSummary = Object.entries(recordsByType).map(([type, records]) => {
      return {
        category: type,
        count: (records as any[]).length,
        recentEntries: (records as any[]).slice(0, 3).map((record: any) => ({
          title: record.title,
          data: record.data,
          date: record.created_at
        }))
      };
    });

    // Generate AI analysis using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a pet patient
    const isPet = patientData?.is_pet === true;
    
    const systemPrompt = `You are an expert ${isPet ? 'veterinary' : 'medical'} AI assistant analyzing ${isPet ? 'pet' : 'patient'} health data. Please provide a comprehensive analysis in the following JSON format:

{
  "overall_health_status": "excellent|good|fair|concerning|critical",
  "key_concerns": ["concern1", "concern2"],
  "recommendations": ["rec1", "rec2"], 
  "recommended_tests": [
    {
      "test_name": "Complete Blood Count (CBC)",
      "test_code": "CBC_85025",
      "category": "blood_work|imaging|specialized|preventive|diagnostic",
      "reason": "Specific medical reason for this test based on findings",
      "urgency": "routine|urgent|stat",
      "confidence": 0.8,
      "contraindications": [],
      "estimated_cost_range": "$50-$100",
      "patient_prep_required": true,
      "related_concerns": ["fatigue", "anemia_risk"]
    }
  ],
  "priority_level": "normal|moderate|urgent",
  "demographics_summary": {
    "age": ${age || 'unknown'},
    "gender": "${patientData?.gender || 'unspecified'}",
    ${isPet ? `"species": "${patientData?.species || 'unknown'}", "breed": "${patientData?.breed || 'unknown'}"` : ''}
  },
  "health_metrics_summary": {
    "total_records": ${Object.keys(recordsByType).length},
    "record_types": ${JSON.stringify(Object.keys(recordsByType))},
    "latest_update": "${new Date().toISOString()}"
  },
  "report_summary": "A comprehensive summary of the health analysis",
  "confidence_score": 0.0-1.0
}

Analysis Guidelines:
1. Focus on ${isPet ? 'veterinary' : 'medical'} patterns and correlations in the data
2. Identify potential health risks based on ${isPet ? 'species, breed, and age' : 'age, gender, and medical history'}
3. Provide actionable recommendations for health improvement
4. Recommend appropriate tests based on findings and risk factors
5. Rate overall health status realistically based on available data
6. Consider ${isPet ? 'veterinary best practices' : 'medical best practices'} in your analysis
7. Be conservative with critical/concerning ratings - only use when clearly warranted
8. Provide specific, actionable recommendations rather than generic advice

Test Recommendation Guidelines:
- Suggest tests that are directly relevant to identified concerns or risk factors
- Consider patient age, gender, ${isPet ? 'species, breed, ' : ''}and medical history
- Prioritize tests by urgency and clinical value
- Avoid recommending tests that were recently performed (within appropriate intervals)
- Include both diagnostic tests for current concerns and preventive screenings
- For ${isPet ? 'pets' : 'humans'}, consider ${isPet ? 'species-appropriate veterinary tests' : 'standard medical screening guidelines'}
- Provide clear reasoning for each test recommendation

${isPet ? 
`VETERINARY ABNORMALITY DETECTION:
- Species-specific normal ranges and behaviors
- Breed-specific health predispositions  
- Age-related changes in pets
- Behavioral indicators of health issues
- Seasonal health patterns
- Vaccination and preventive care status` :
`MEDICAL ABNORMALITY DETECTION:
- Values outside normal clinical ranges
- Trending patterns indicating deterioration or improvement  
- Risk factors for common conditions based on demographics
- Medication interactions and side effects
- Lifestyle factors affecting health outcomes
- Preventive care gaps based on age and risk factors`}`;

    const userPrompt = `Patient: ${patientContext.name}
Age: ${age || 'Unknown'}
Gender: ${patientContext.gender}
Total Health Records: ${patientContext.totalRecords}

Health Data Summary:
${JSON.stringify(healthSummary, null, 2)}

Please analyze this health information comprehensively and provide the requested JSON report with test recommendations based on the findings and patient demographics.`;

    console.log('Sending request to OpenAI for comprehensive health analysis');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status, await openAIResponse.text());
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await openAIResponse.json();
    console.log('OpenAI response received');

    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return new Response(JSON.stringify({ error: 'AI response parsing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save the comprehensive report to the database
    const { data: report, error: reportError } = await supabaseClient
      .from('comprehensive_health_reports')
      .upsert({
        user_id: user.id,
        patient_id: patient_id || null,
        overall_health_status: analysisResult.overall_health_status,
        key_concerns: analysisResult.key_concerns,
        recommendations: analysisResult.recommendations,
        recommended_tests: analysisResult.recommended_tests || [],
        priority_level: analysisResult.priority_level,
        demographics_summary: analysisResult.demographics_summary,
        health_metrics_summary: analysisResult.health_metrics_summary,
        report_summary: analysisResult.report_summary,
        confidence_score: analysisResult.confidence_score,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error saving comprehensive report:', reportError);
      return new Response(JSON.stringify({ error: 'Failed to save report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Comprehensive health report generated and saved successfully');

    return new Response(JSON.stringify({ 
      report,
      message: 'Comprehensive health report generated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-comprehensive-health-report:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});