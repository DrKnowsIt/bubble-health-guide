import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user_id = userData.user.id;

    // Verify ownership via RLS (row exists only if owned)
    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .maybeSingle();

    if (patientErr || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Latest AI report (doctor_notes with note_type = 'ai_report')
    const { data: lastReport } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('user_id', user_id)
      .eq('patient_id', patient_id)
      .eq('note_type', 'ai_report')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check most recent health data update
    const { data: latestRecord } = await supabase
      .from('health_records')
      .select('updated_at')
      .eq('user_id', user_id)
      .eq('patient_id', patient_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const shouldRun = !lastReport || (latestRecord && new Date(latestRecord.updated_at) > new Date(lastReport.updated_at));

    // If no updates and report exists, skip run
    if (!shouldRun) {
      return new Response(
        JSON.stringify({ ran: false, steps: [], message: 'Report up-to-date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant health data
    const { data: records } = await supabase
      .from('health_records')
      .select('id,title,record_type,data,created_at,updated_at')
      .eq('user_id', user_id)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false })
      .limit(25);

    const hasDNA = (records || []).some(r => (r.record_type || '').toLowerCase().includes('dna') || (r.record_type || '').toLowerCase().includes('genetic'));
    const hasForms = (records || []).some(r => ['symptom_tracker','vital_signs','medication_log','mood_tracker','pain_tracker','sleep_tracker'].includes(r.record_type || ''));

    const steps: string[] = [
      'Examining Health Records',
      ...(hasForms ? ['Reviewing Health Forms'] : []),
      ...(hasDNA ? ['Looking at DNA'] : []),
      'Updating Health Report',
      'Updating Possible Diagnoses',
    ];

    // Build concise context for the model
    const patientAge = patient.date_of_birth 
      ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const context = {
      patient: {
        name: `${patient.first_name} ${patient.last_name}`.trim(),
        age: patientAge,
        gender: patient.gender,
        relationship: patient.relationship,
        is_primary: patient.is_primary,
      },
      records: (records || []).map(r => ({
        id: r.id,
        title: r.title,
        type: r.record_type,
        created_at: r.created_at,
        updated_at: r.updated_at,
        data_preview: r.data ? JSON.stringify(r.data).slice(0, 500) : null,
      })),
      current_probable_diagnoses: patient.probable_diagnoses || [],
    };

    const systemPrompt = `You are an AI medical analyst agent that prepares a structured patient health report based on available records and notes. 
- Do NOT provide medical diagnosis; provide possibilities to discuss with a doctor. 
- Return STRICT JSON with keys: report_summary (string), diagnoses (array of {diagnosis, confidence (0-1), reasoning}).`;

    const userPrompt = `Analyze this patient data and produce an updated concise report and possibilities to discuss with their doctor. Focus on unusual patterns or concerning trends.\n\nDATA:\n${JSON.stringify(context)}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('OpenAI error', errText);
      return new Response(JSON.stringify({ error: 'AI request failed', details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '{}';

    let parsed: { report_summary?: string; diagnoses?: Array<{ diagnosis: string; confidence: number; reasoning?: string }>; } = {};
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      parsed = { report_summary: 'AI produced non-JSON response', diagnoses: [] };
    }

    const reportSummary = parsed.report_summary?.slice(0, 4000) || 'No summary generated';
    const diagnoses = (parsed.diagnoses || []).slice(0, 10);

    // Upsert doctor note as the "report file"
    await supabase
      .from('doctor_notes')
      .upsert({
        user_id,
        patient_id,
        note_type: 'ai_report',
        title: 'AI Health Report',
        content: reportSummary,
        is_active: true,
      }, { onConflict: 'user_id,patient_id,note_type' });

    // Update patient probable diagnoses as the "formatted file"
    await supabase
      .from('patients')
      .update({ probable_diagnoses: diagnoses })
      .eq('id', patient_id);

    return new Response(
      JSON.stringify({ ran: true, steps, report_summary: reportSummary, diagnoses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('patient-report-agent error', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
