import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const { patient_id, user_id } = await req.json();

    if (!patient_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing patient_id or user_id' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service key for comprehensive data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting comprehensive data fetch for final analysis');

    // Fetch all relevant data for comprehensive analysis
    const [
      { data: patientData },
      { data: conversationMemory },
      { data: diagnoses },
      { data: solutions },
      { data: healthRecords },
      { data: healthSummaries },
      { data: healthInsights }, 
      { data: easyChatSessions },
      { data: comprehensiveReports }
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patient_id).single(),
      supabase.from('conversation_memory').select('*').eq('patient_id', patient_id).order('updated_at', { ascending: false }),
      supabase.from('conversation_diagnoses').select('*').eq('patient_id', patient_id).order('confidence', { ascending: false }),
      supabase.from('conversation_solutions').select('*').eq('patient_id', patient_id).order('confidence', { ascending: false }),
      supabase.from('health_records').select('*').eq('patient_id', patient_id).order('created_at', { ascending: false }),
      supabase.from('health_record_summaries').select('*').eq('user_id', user_id).order('created_at', { ascending: false }),
      supabase.from('health_insights').select('*').eq('patient_id', patient_id).order('created_at', { ascending: false }),
      supabase.from('easy_chat_sessions').select('*').eq('patient_id', patient_id).eq('completed', true).order('created_at', { ascending: false }),
      supabase.from('comprehensive_health_reports').select('*').eq('patient_id', patient_id).order('updated_at', { ascending: false }).limit(1)
    ]);

    if (!patientData) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Data fetched successfully, generating comprehensive analysis');

    // Prepare comprehensive context for AI analysis
    const patientAge = patientData.date_of_birth 
      ? Math.floor((Date.now() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 'Unknown';

    const systemPrompt = `You are an advanced medical AI assistant performing a comprehensive final analysis for a healthcare provider. Your task is to synthesize all available patient data and provide a thorough clinical assessment.

Patient Information:
- Name: ${patientData.first_name} ${patientData.last_name}
- Age: ${patientAge}
- Gender: ${patientData.gender || 'Not specified'}
- Pet: ${patientData.is_pet ? 'Yes' : 'No'}
${patientData.species ? `- Species: ${patientData.species}` : ''}
${patientData.breed ? `- Breed: ${patientData.breed}` : ''}

Available Data Sources:
- Conversation memories: ${conversationMemory?.length || 0} entries
- AI diagnoses: ${diagnoses?.length || 0} entries  
- Treatment solutions: ${solutions?.length || 0} entries
- Health records: ${healthRecords?.length || 0} entries
- Health summaries: ${healthSummaries?.length || 0} entries
- Health insights: ${healthInsights?.length || 0} entries
- AI chat sessions: ${easyChatSessions?.length || 0} completed sessions
- Previous comprehensive reports: ${comprehensiveReports?.length || 0} reports

Provide a comprehensive final medical analysis in the following JSON format:
{
  "analysis_summary": "Comprehensive synthesis of all patient data and key clinical findings",
  "key_findings": [
    {
      "finding": "Primary clinical finding",
      "evidence": "Supporting evidence from data",
      "significance": "Clinical significance",
      "confidence": 0.85
    }
  ],
  "doctor_test_recommendations": [
    {
      "test_name": "Specific diagnostic test name",
      "test_code": "CPT/ICD code if applicable",
      "category": "Lab/Imaging/Specialty",
      "urgency": "Routine/Urgent/Emergent", 
      "reason": "Clinical rationale for this test",
      "confidence": 0.90,
      "estimated_cost_range": "$50-150",
      "patient_prep_required": true,
      "contraindications": ["List any contraindications"]
    }
  ],
  "holistic_assessment": "Overall patient health assessment considering all factors",
  "risk_assessment": "Risk stratification and concerning patterns",
  "clinical_insights": {
    "patterns_identified": ["List significant patterns"],
    "symptom_clusters": ["Related symptom groups"],
    "timeline_analysis": "Chronological analysis of symptoms/conditions"
  },
  "follow_up_recommendations": [
    "Specific follow-up recommendations for ongoing care"
  ],
  "priority_level": "low/normal/high/critical",
  "confidence_score": 0.88,
  "data_sources_analyzed": {
    "conversation_memories": ${conversationMemory?.length || 0},
    "diagnoses": ${diagnoses?.length || 0},
    "solutions": ${solutions?.length || 0},
    "health_records": ${healthRecords?.length || 0},
    "insights": ${healthInsights?.length || 0}
  }
}

Focus on clinical accuracy, evidence-based recommendations, and providing actionable insights for healthcare providers.`;

    const userPrompt = `Please analyze the following comprehensive patient data:

CONVERSATION MEMORIES:
${conversationMemory?.map(mem => `- ${mem.summary || 'No summary'} (Updated: ${mem.updated_at})`).join('\n') || 'None available'}

AI DIAGNOSES:
${diagnoses?.map(diag => `- ${diag.diagnosis} (Confidence: ${Math.round((diag.confidence || 0) * 100)}%) - ${diag.reasoning || 'No reasoning provided'}`).join('\n') || 'None available'}

TREATMENT SOLUTIONS:
${solutions?.map(sol => `- ${sol.category}: ${sol.solution} (Confidence: ${Math.round((sol.confidence || 0) * 100)}%)`).join('\n') || 'None available'}

HEALTH RECORDS:
${healthRecords?.map(record => `- ${record.title}: ${record.record_type} (Created: ${record.created_at})`).join('\n') || 'None available'}

HEALTH INSIGHTS:
${healthInsights?.map(insight => `- ${insight.title}: ${insight.description} (Severity: ${insight.severity_level})`).join('\n') || 'None available'}

EASY CHAT SESSIONS:
${easyChatSessions?.map(session => `- Session from ${session.created_at}: ${session.final_summary || 'No summary'}`).join('\n') || 'None available'}

PREVIOUS COMPREHENSIVE REPORTS:
${comprehensiveReports?.map(report => `- Status: ${report.overall_health_status}, Priority: ${report.priority_level}, Summary: ${report.report_summary}`).join('\n') || 'None available'}

Provide your comprehensive final analysis focusing on clinical accuracy and actionable recommendations.`;

    console.log('Calling OpenAI API for comprehensive analysis');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisContent = aiResponse.choices[0].message.content;

    console.log('AI analysis generated, parsing response');

    // Parse AI response
    let analysisData;
    try {
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = analysisContent.match(/```json\n([\s\S]*?)\n```/) || analysisContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisContent;
      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI analysis response');
    }

    // Store the final analysis in the database
    const { data: finalAnalysis, error: insertError } = await supabase
      .from('final_medical_analysis')
      .insert({
        user_id,
        patient_id,
        analysis_summary: analysisData.analysis_summary,
        key_findings: analysisData.key_findings || [],
        doctor_test_recommendations: analysisData.doctor_test_recommendations || [],
        holistic_assessment: analysisData.holistic_assessment,
        risk_assessment: analysisData.risk_assessment,
        clinical_insights: analysisData.clinical_insights || {},
        confidence_score: analysisData.confidence_score,
        data_sources_analyzed: analysisData.data_sources_analyzed || {},
        follow_up_recommendations: analysisData.follow_up_recommendations || [],
        priority_level: analysisData.priority_level || 'normal'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save analysis: ${insertError.message}`);
    }

    console.log('Final analysis saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: finalAnalysis,
        message: 'Comprehensive final medical analysis generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-final-medical-analysis:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to generate comprehensive medical analysis'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});