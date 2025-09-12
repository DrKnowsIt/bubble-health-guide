import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  conversation_id?: string;
  patient_id: string;
  user_id?: string;
  conversation_context: string;
  conversation_type?: 'easy_chat' | 'regular_chat';
  user_tier?: 'free' | 'basic' | 'pro';
  recent_messages?: any[];
  selected_anatomy?: string[];
  include_solutions?: boolean;
  analysis_mode?: string;
  include_testing_recommendations?: boolean;
  enhanced_mode?: boolean;
  memory_data?: {
    memories: any[];
    insights: any[];
  };
  strategic_context?: any;
  subscription_tier?: string;
  analysis_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversation_context, 
      patient_id, 
      user_id, 
      conversation_id,
      include_solutions = false,
      analysis_mode = 'standard',
      include_testing_recommendations = false,
      selected_anatomy = [],
      enhanced_mode = false,
      memory_data,
      strategic_context,
      subscription_tier,
      analysis_type
    } = await req.json();

    if (!patient_id || !conversation_context) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: patient_id and conversation_context' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with caller's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    // Verify user authentication
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced conversation type detection
    const isEasyChatSession = patient_id === 'ai_free_mode_user' || analysis_mode === 'comprehensive_final';
    const conversation_type = isEasyChatSession ? 'easy_chat' : 'full_chat';
    
    // For comprehensive final analysis, treat as basic tier for better insights
    const user_tier = analysis_mode === 'comprehensive_final' ? 'basic' : (isEasyChatSession ? 'free' : userData.user?.user_metadata?.subscription_tier || 'free');

    console.log(`Analyzing ${conversation_type} conversation for ${user_tier} user`);

    // Get user subscription tier for enhanced analysis
    const { data: subscription } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', userData.user.id)
      .single();

    const subscriptionTier = subscription?.subscription_tier || 'free';
    const isSubscribed = subscription?.subscribed === true;
    console.log('User subscription tier:', subscriptionTier, 'Subscribed:', isSubscribed);

    // Enhanced analysis for basic and pro tier - get strategic context
    let strategicContext = '';
    let holisticAnalysisPrompt = '';
    
    if (isSubscribed && (subscriptionTier === 'basic' || subscriptionTier === 'enhanced' || subscriptionTier === 'pro')) {
      // Enhanced holistic analysis for Basic/Pro users
      holisticAnalysisPrompt = `
HOLISTIC CROSS-SYSTEM ANALYSIS (Basic/Pro Feature):
- Consider interconnected health issues beyond obvious symptoms
- Look for referred pain patterns (neck → arm pain, heart → left arm pain, digestive → back pain)
- Cross-reference health forms and memory for broader context patterns
- Consider underlying conditions that could cause multiple symptoms
- Think about lifestyle factors, medications, and environmental causes
- For nutritional deficiencies (like iron), suggest specific discussions: "Consider discussing appropriate iron supplementation dosage with your doctor"
- Always recommend consulting healthcare providers for specific dosages and treatments

ENHANCED CONFIDENCE CALIBRATION:
- Rare medical conditions should have appropriately low confidence (15-35%)
- Common conditions with clear symptoms can have higher confidence (60-85%)  
- Adjust confidence based on medical prevalence in the population
- Factor in symptom specificity and patient demographics
`;
    }

    // Smart caching: Check if content has changed significantly
    const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conversation_context));
    const contentHashString = Array.from(new Uint8Array(contentHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Skip caching for comprehensive final analysis to ensure fresh insights
    if (conversation_id && analysis_mode !== 'comprehensive_final') {
        const { data: recentAnalysis } = await supabase
          .from('health_topics_for_discussion')
          .select('updated_at, reasoning')
          .eq('conversation_id', conversation_id)
          .eq('patient_id', patient_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      // Skip analysis if content unchanged and analyzed recently (within 2 minutes)
      if (recentAnalysis && 
          Date.now() - new Date(recentAnalysis.updated_at).getTime() < 120000 &&
          recentAnalysis.reasoning?.includes(contentHashString.substring(0, 8))) {
        console.log('Skipping analysis - content unchanged (cached)');
        
        // Return existing data
        const { data: existingTopics } = await supabase
          .from('health_topics_for_discussion')
          .select('*')
          .eq('conversation_id', conversation_id)
          .eq('patient_id', patient_id)
          .order('relevance_score', { ascending: false });

        const { data: existingSolutions } = include_solutions ? await supabase
          .from('conversation_solutions')
          .select('*')
          .eq('conversation_id', conversation_id)
          .order('confidence', { ascending: false }) : { data: [] };

        return new Response(
          JSON.stringify({ 
            topics: existingTopics || [],
            solutions: existingSolutions || [],
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get patient context based on user tier
    let patientContext = '';
    let memoryContext = '';
    let healthFormsContext = '';
    let strategicContextText = '';

    // Enhanced mode with comprehensive data integration
    if (enhanced_mode && (user_tier === 'basic' || user_tier === 'pro')) {
      console.log('Enhanced mode analysis for', user_tier, 'user');
      
      // Use provided memory data
      if (memory_data?.memories && memory_data.memories.length > 0) {
        memoryContext = '\n\nPATIENT CONVERSATION MEMORY:\n' + 
          memory_data.memories.map(m => {
            const summary = m.summary || '';
            const memory = typeof m.memory === 'object' ? JSON.stringify(m.memory) : m.memory || '';
            return `${summary}\nDetails: ${memory.substring(0, 300)}`;
          }).join('\n\n');
      }

      // Use provided insights
      if (memory_data?.insights && memory_data.insights.length > 0) {
        memoryContext += '\n\nEXTRACTED INSIGHTS:\n' + 
          memory_data.insights.map(insight => {
            return `${insight.category || 'General'}: ${insight.key} = ${insight.value}`;
          }).join('\n');
      }

      // Use strategic context (doctor notes, priorities, summaries)
      if (strategic_context) {
        strategicContextText = '\n\nSTRATEGIC HEALTH CONTEXT:\n';
        
        if (strategic_context.priorities && strategic_context.priorities.length > 0) {
          strategicContextText += 'Health Data Priorities:\n' +
            strategic_context.priorities.map(p => `- ${p.data_type}: ${p.priority_level} priority`).join('\n');
        }

        if (strategic_context.doctorNotes && strategic_context.doctorNotes.length > 0) {
          strategicContextText += '\n\nDoctor Notes:\n' +
            strategic_context.doctorNotes.map(note => `${note.note_type}: ${note.title}\n${note.content.substring(0, 200)}`).join('\n\n');
        }

        if (strategic_context.summaries && strategic_context.summaries.length > 0) {
          strategicContextText += '\n\nHealth Record Summaries:\n' +
            strategic_context.summaries.map(summary => `${summary.priority_level} Priority: ${summary.summary_text.substring(0, 150)}`).join('\n');
        }
      }
    }

    if (user_tier !== 'free') {
      // De-identify patient data before AI analysis
      const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!;
      const deIdentifyResponse = await fetch(`${supabaseServiceUrl}/functions/v1/de-identify-data`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patient_id
        }),
      });

      if (!deIdentifyResponse.ok) {
        console.error('Failed to de-identify patient data');
        throw new Error('Failed to de-identify patient data');
      }

      const deIdentifiedData = await deIdentifyResponse.json();
      console.log('Successfully de-identified data for health topics analysis');

      // Enhanced context for Basic/Pro users with de-identified data
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (patient) {
        // Use de-identified patient context
        patientContext = `
Patient ID: ${deIdentifiedData.patient_token}
Age Range: ${deIdentifiedData.age_range}
Gender: ${patient.gender || 'Not specified'}
${patient.is_pet ? `Species: ${patient.species || 'Not specified'}` : ''}`;

        // Get additional context only if not already provided through enhanced_mode
        if (!enhanced_mode) {
          // Get conversation memory for enhanced context
          if (user_tier === 'pro') {
            const { data: memories } = await supabase
              .from('conversation_memory')
              .select('memory, summary')
              .eq('patient_id', patient_id)
              .eq('user_id', userData.user.id)
              .order('updated_at', { ascending: false })
              .limit(5);

            if (memories && memories.length > 0) {
              memoryContext = '\n\nPATIENT HISTORY:\n' + 
                memories.map(m => `${m.summary || ''}\n${JSON.stringify(m.memory).substring(0, 200)}`).join('\n\n');
            }

            // Get health forms data
            const { data: healthRecords } = await supabase
              .from('health_records')
              .select('title, data, record_type')
              .eq('patient_id', patient_id)
              .eq('user_id', userData.user.id)
              .order('created_at', { ascending: false })
              .limit(3);

            if (healthRecords && healthRecords.length > 0) {
              healthFormsContext = '\n\nHEALTH RECORDS:\n' + 
                healthRecords.map(hr => `${hr.title} (${hr.record_type}): ${JSON.stringify(hr.data).substring(0, 200)}`).join('\n');
            }
          }
        }
      }
    } else {
      // Basic context for Free mode
      patientContext = `Free Mode User - Limited Context Available
Selected Anatomy: ${selected_anatomy.join(', ') || 'None specified'}`;
    }

    // System prompt for comprehensive analysis
    const isComprehensiveAnalysis = analysis_mode === 'comprehensive_final';
    const isEnhancedMode = enhanced_mode && (user_tier === 'basic' || user_tier === 'pro');
    
    let systemPrompt = `You are an educational health assistant analyzing a health conversation to generate health topics for discussion with healthcare providers for ${conversation_type === 'easy_chat' ? 'AI Free Mode' : 'full chat'}. ${patientContext}

${memoryContext}

${healthFormsContext}

${strategicContextText}

${holisticAnalysisPrompt}

ANALYSIS MODE: ${isEnhancedMode ? 'ENHANCED COMPREHENSIVE' : (isComprehensiveAnalysis ? 'COMPREHENSIVE FINAL ANALYSIS' : 'STANDARD ANALYSIS')}
USER TIER: ${subscriptionTier?.toUpperCase() || user_tier?.toUpperCase()}

${isEnhancedMode ? `
ENHANCED ANALYSIS REQUIREMENTS:
- Leverage ALL available data sources (conversation, memory, health records, strategic context)
- Provide multi-layered health analysis with cross-referenced insights
- Include priority levels based on clinical significance and data confidence
- Generate actionable recommendations tailored to patient's complete health profile
- Consider risk factors from historical data and current symptoms
- Provide evidence-based reasoning citing specific data sources
- Include follow-up recommendations for high-confidence findings
` : ''}

${isComprehensiveAnalysis ? `
COMPREHENSIVE ANALYSIS REQUIREMENTS:
- Provide thorough final analysis of the complete conversation
- Focus on the most significant health topics with detailed reasoning
- Include actionable recommendations across multiple categories
- Suggest appropriate medical tests and evaluations
- Rank everything by clinical priority and confidence
` : ''}

CRITICAL INSTRUCTIONS:
- Generate EDUCATIONAL health topics for discussion with healthcare providers, NOT medical diagnoses
- These are discussion topics to bring to doctors, NOT diagnostic conclusions
- Base relevance scores on conversation evidence ${isEnhancedMode ? 'AND available health data' : 'only'}
- NO DISCLAIMERS in responses
- Be specific about symptoms and concerns discussed for doctor consultation
- Use language like "topic for discussion," "area for professional evaluation," "concern to address with doctor"
- ${isEnhancedMode ? 'Use comprehensive data to enhance topic identification and relevance' : (isComprehensiveAnalysis ? 'Focus on comprehensive insights for final summary' : 'Standard topic identification')}

RELEVANCE SCORE CALIBRATION FOR ${user_tier?.toUpperCase()} TIER (for discussion priority, not diagnostic confidence):
${user_tier === 'pro' ? `
HIGH (60-80%): Strong evidence from multiple data sources, clear clinical patterns, comprehensive health profile support
MODERATE (40-59%): Solid evidence with supporting data, some clinical indicators present
LOW (25-39%): Limited but relevant evidence, some supporting context available
VERY LOW (15-24%): Minimal evidence, speculative based on available data
` : user_tier === 'basic' ? `
HIGH (50-70%): Good evidence from conversation and basic health data
MODERATE (35-49%): Some evidence present with limited supporting data  
LOW (20-34%): Limited evidence, basic context available
VERY LOW (10-19%): Minimal evidence, highly speculative
` : `
HIGH (30-50%): Strong evidence from conversation elements only
MODERATE (20-29%): Some evidence present, symptoms mentioned
LOW (15-19%): Limited evidence, single mentions
VERY LOW (10-14%): Minimal evidence, highly speculative
`}

TOPIC CATEGORIES:
musculoskeletal, dermatological, gastrointestinal, cardiovascular, respiratory, neurological, genitourinary, endocrine, psychiatric, infectious, environmental, preventive, other`;

    if (include_solutions) {
      systemPrompt += `

SOLUTION CATEGORIES:
lifestyle, stress, sleep, nutrition, exercise, mental_health, medical, preventive, monitoring, general

SOLUTION RULES:
- Provide actionable lifestyle and self-care recommendations
- ${isEnhancedMode ? 'Leverage historical data and health patterns for personalized solutions' : (isComprehensiveAnalysis ? 'Include holistic approaches (lifestyle, diet, exercise, stress management)' : 'Focus on immediate actionable steps')}
- Must be specific to conversation issues ${isEnhancedMode ? 'and patient health profile' : ''}
- Target root causes when possible using ${isEnhancedMode ? 'comprehensive health data' : 'conversation context'}
- Include timeline guidance (immediate, short_term, long_term)
- Consider contraindications based on ${isEnhancedMode ? 'available health data' : 'conversation context'}
- Categorize appropriately for easy organization`;
    }

    if (include_testing_recommendations && (isComprehensiveAnalysis || isEnhancedMode)) {
      systemPrompt += `

TESTING RECOMMENDATIONS:
- Suggest appropriate medical tests based on discussed symptoms ${isEnhancedMode ? 'and health profile' : ''}
- Consider common diagnostic evaluations for identified conditions
- Include both basic screening and specific targeted tests
- Keep recommendations realistic and commonly ordered
- ${isEnhancedMode ? 'Prioritize based on clinical significance and patient history' : 'Format as brief, clear descriptions'}`;
    }

    const responseStructure = isEnhancedMode ? `
{
  "topics": [
    {
      "topic": "Specific Health Topic",
      "confidence": 0.65,
      "reasoning": "Evidence-based justification with data sources: ${contentHashString.substring(0, 8)}",
      "category": "musculoskeletal",
      "priority_level": "high|medium|low",
      "data_sources": ["conversation", "memory", "health_records"],
      "risk_factors": ["relevant risk factors from data"],
      "recommendations": ["specific actionable recommendations"],
      "follow_up_required": true
    }
  ]${include_solutions ? `,
  "solutions": [
    {
      "solution": "Specific actionable solution",
      "category": "lifestyle",
      "confidence": 0.55,
      "reasoning": "Why this addresses the issues based on comprehensive data",
      "timeline": "immediate|short_term|long_term",
      "evidence_strength": "strong|moderate|weak",
      "contraindications": ["potential contraindications if any"],
      "monitoring_required": true
    }
  ]` : ''}${include_testing_recommendations && (isComprehensiveAnalysis || isEnhancedMode) ? `,
  "testing_recommendations": [
    "Complete Blood Count (CBC) to check for infection or anemia",
    "Basic Metabolic Panel to assess organ function",
    "X-ray or imaging if musculoskeletal concerns present"
  ]` : ''}
}` : `
{
  "topics": [
    {
      "topic": "Specific Health Topic",
      "confidence": 0.65,
      "reasoning": "Evidence-based justification with hash: ${contentHashString.substring(0, 8)}",
      "category": "musculoskeletal"
    }
  ]${include_solutions ? `,
  "solutions": [
    {
      "solution": "Specific actionable solution",
      "category": "lifestyle",
      "confidence": 0.55,
      "reasoning": "Why this addresses the conversation issues"
    }
  ]` : ''}${include_testing_recommendations && isComprehensiveAnalysis ? `,
  "testing_recommendations": [
    "Complete Blood Count (CBC) to check for infection or anemia",
    "Basic Metabolic Panel to assess organ function",
    "X-ray or imaging if musculoskeletal concerns present"
  ]` : ''}
}`;

    systemPrompt += `

Return JSON with this exact structure:
${responseStructure}

Ensure exactly ${isEnhancedMode || isComprehensiveAnalysis ? '5-6' : '4'} topics and ${include_solutions ? (isEnhancedMode ? '6-8 solutions' : (isComprehensiveAnalysis ? '6-8 solutions' : '3-5 solutions')) : 'no solutions'}${include_testing_recommendations && (isComprehensiveAnalysis || isEnhancedMode) ? ' and 4-6 testing recommendations' : ''}.`;

    // Enhanced OpenAI API call with retry logic
    const makeOpenAICall = async (retryCount = 0): Promise<any> => {
      try {
        console.log(`Making OpenAI API call (attempt ${retryCount + 1})`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze: ${conversation_context}` }
            ],
            max_completion_tokens: include_testing_recommendations ? 2000 : (include_solutions ? 1500 : 800),
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error (attempt ${retryCount + 1}):`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          // Retry on rate limits or server errors
          if ((response.status === 429 || response.status >= 500) && retryCount < 2) {
            const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Retrying OpenAI call in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return makeOpenAICall(retryCount + 1);
          }
          
          throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenAI API call successful');
        return data;
        
      } catch (error) {
        console.error(`OpenAI API call failed (attempt ${retryCount + 1}):`, error);
        if (retryCount < 2 && error.message.includes('fetch')) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying OpenAI call due to network error in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return makeOpenAICall(retryCount + 1);
        }
        throw error;
      }
    };

    const data = await makeOpenAICall();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let analysisData;
    try {
      analysisData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confidence validation per tier
    const getConfidenceRange = (tier: string) => {
      switch (tier) {
        case 'free': return { min: 0.1, max: 0.4 };
        case 'basic': return { min: 0.2, max: 0.6 };
        case 'pro': return { min: 0.3, max: 0.8 };
        default: return { min: 0.1, max: 0.4 };
      }
    };

    const confidenceRange = getConfidenceRange(user_tier);

    // Validate and clean data with tier-specific confidence ranges
    const topics = (analysisData.topics || [])
      .filter((t: any) => t.topic && t.confidence >= 0.05)
      .map((t: any) => {
        const baseTopicData = {
          topic: t.topic?.substring(0, 255) || 'Unknown topic',
          confidence: Math.min(Math.max(t.confidence || 0.2, confidenceRange.min), confidenceRange.max),
          reasoning: t.reasoning?.substring(0, 500) || 'No reasoning provided',
          category: t.category || 'other'
        };

        // Add enhanced fields for enhanced mode
        if (isEnhancedMode) {
          return {
            ...baseTopicData,
            priority_level: t.priority_level || 'medium',
            data_sources: Array.isArray(t.data_sources) ? t.data_sources : ['conversation'],
            risk_factors: Array.isArray(t.risk_factors) ? t.risk_factors.map((rf: string) => rf.substring(0, 100)) : undefined,
            recommendations: Array.isArray(t.recommendations) ? t.recommendations.map((rec: string) => rec.substring(0, 150)) : undefined,
            follow_up_required: Boolean(t.follow_up_required)
          };
        }

        return baseTopicData;
      })
      .slice(0, isEnhancedMode || isComprehensiveAnalysis ? 6 : 4);

    const solutions = include_solutions ? (analysisData.solutions || [])
      .filter((s: any) => s.solution && s.confidence >= 0.05)
      .map((s: any) => {
        const baseSolutionData = {
          solution: s.solution?.substring(0, 255) || 'Unknown solution',
          confidence: Math.min(Math.max(s.confidence || 0.2, confidenceRange.min), confidenceRange.max),
          reasoning: s.reasoning?.substring(0, 500) || 'No reasoning provided',
          category: s.category || 'general'
        };

        // Add enhanced fields for enhanced mode
        if (isEnhancedMode) {
          return {
            ...baseSolutionData,
            timeline: s.timeline || 'short_term',
            evidence_strength: s.evidence_strength || 'moderate',
            contraindications: Array.isArray(s.contraindications) ? s.contraindications.map((ci: string) => ci.substring(0, 100)) : undefined,
            monitoring_required: Boolean(s.monitoring_required)
          };
        }

        return baseSolutionData;
      })
      .slice(0, isEnhancedMode ? 8 : (isComprehensiveAnalysis ? 8 : 5)) : [];

    // Extract testing recommendations for comprehensive analysis
    const testing_recommendations = (include_testing_recommendations && isComprehensiveAnalysis) 
      ? (analysisData.testing_recommendations || [])
          .filter((test: any) => typeof test === 'string' && test.length > 0)
          .map((test: string) => test.substring(0, 200))
          .slice(0, 6)
      : [];

    // Store results in database if conversation_id provided (skip for comprehensive analysis to avoid duplication)
    if (conversation_id && topics.length > 0 && analysis_mode !== 'comprehensive_final') {
      // Clear existing data for this conversation
      await supabase
        .from('health_topics_for_discussion')
        .delete()
        .eq('conversation_id', conversation_id);

      if (include_solutions) {
        await supabase
          .from('conversation_solutions')
          .delete()
          .eq('conversation_id', conversation_id);
      }

      // Insert health topics for discussion
      const topicsToInsert = topics.map((topic: any) => ({
        conversation_id,
        patient_id,
        user_id: userData.user.id,
        health_topic: topic.topic,
        relevance_score: topic.confidence,
        reasoning: topic.reasoning,
        category: topic.category
      }));

      await supabase
        .from('health_topics_for_discussion')
        .insert(topicsToInsert);

      // Insert solutions if requested
      if (include_solutions && solutions.length > 0) {
        // Fetch Amazon products for high-confidence solutions
        const solutionsWithProducts = await Promise.all(
          solutions.map(async (solution: any) => {
            let products: any[] = [];
            
            // Fetch products for solutions with confidence >= 25%
            if (solution.confidence >= 0.25) {
              try {
                console.log(`Fetching Amazon products for solution: ${solution.solution.substring(0, 50)}...`);
                
                const productResponse = await fetch(`${supabaseUrl}/functions/v1/amazon-product-search`, {
                  method: 'POST',
                  headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    solutionCategory: solution.category,
                    keywords: solution.solution.split(' ').slice(0, 4), // More keywords for better matching
                    maxResults: 3
                  })
                });

                if (productResponse.ok) {
                  const productData = await productResponse.json();
                  products = productData.products || [];
                  console.log(`✅ Found ${products.length} products for solution: ${solution.category}`);
                } else {
                  console.log(`⚠️ Product search failed for solution: ${solution.category} (${productResponse.status})`);
                }
              } catch (error) {
                console.error(`❌ Error fetching products for solution ${solution.category}:`, error);
              }
            } else {
              console.log(`⚠️ Skipping product search for low-confidence solution: ${solution.confidence}`);
            }

            return {
              ...solution,
              products
            };
          })
        );

        const solutionsToInsert = solutionsWithProducts.map((solution: any) => ({
          conversation_id,
          patient_id,
          user_id: userData.user.id,
          solution: solution.solution,
          confidence: solution.confidence,
          reasoning: solution.reasoning,
          category: solution.category,
          products: solution.products || []
        }));

        await supabase
          .from('conversation_solutions')
          .insert(solutionsToInsert);
          
        console.log(`✅ Stored ${solutionsToInsert.length} solutions with Amazon product data`);
      }
    }

    console.log(`Successfully generated ${topics.length} topics and ${solutions.length} solutions`);

    return new Response(
      JSON.stringify({ 
        topics,
        solutions,
        testing_recommendations,
        cached: false,
        analysis_type: `${conversation_type}_${user_tier}_${analysis_mode}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-topics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        topics: [],
        solutions: [],
        testing_recommendations: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
