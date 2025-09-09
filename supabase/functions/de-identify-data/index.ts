import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface DeIdentificationRequest {
  patient_id: string;
  conversation_text?: string;
  patient_context?: any;
}

interface DeIdentificationResponse {
  patient_token: string;
  age_range: string;
  de_identified_text?: string;
  de_identified_context?: any;
}

function calculateAgeRange(birthDate: string): string {
  const today = new Date();
  const birth = new Date(birthDate);
  const age = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  if (age < 18) return "0-17";
  if (age < 30) return "18-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  if (age < 80) return "70-79";
  return "80+";
}

function deIdentifyText(text: string, patientName: string, patientToken: string): string {
  if (!text) return text;
  
  // Replace full name mentions
  const namePattern = new RegExp(patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let deIdentified = text.replace(namePattern, patientToken);
  
  // Replace common name patterns
  const firstNameOnly = patientName.split(' ')[0];
  if (firstNameOnly && firstNameOnly.length > 2) {
    const firstNamePattern = new RegExp(`\\b${firstNameOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    deIdentified = deIdentified.replace(firstNamePattern, patientToken);
  }
  
  return deIdentified;
}

function deIdentifyObject(obj: any, patientName: string, patientToken: string): any {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return deIdentifyText(obj, patientName, patientToken);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deIdentifyObject(item, patientName, patientToken));
  }
  
  if (typeof obj === 'object') {
    const deIdentified: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip or modify specific PII fields
      if (key === 'first_name' || key === 'last_name') {
        deIdentified[key] = patientToken;
      } else if (key === 'date_of_birth') {
        // Convert to age range instead of exact birth date
        if (typeof value === 'string') {
          deIdentified['age_range'] = calculateAgeRange(value);
        }
      } else {
        deIdentified[key] = deIdentifyObject(value, patientName, patientToken);
      }
    }
    return deIdentified;
  }
  
  return obj;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id, conversation_text, patient_context }: DeIdentificationRequest = await req.json();

    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('De-identifying data for patient:', patient_id);

    // Get or create patient token
    let { data: existingToken, error: tokenError } = await supabase
      .from('patient_tokens')
      .select('token_id')
      .eq('user_id', user.id)
      .eq('patient_id', patient_id)
      .single();

    let patientToken: string;

    if (tokenError || !existingToken) {
      // Generate new token
      const { data: tokenCount } = await supabase
        .from('patient_tokens')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      const tokenNumber = (tokenCount?.length || 0) + 1;
      patientToken = `Patient_${tokenNumber.toString().padStart(3, '0')}`;

      // Store the new token
      const { error: insertError } = await supabase
        .from('patient_tokens')
        .insert({
          user_id: user.id,
          patient_id: patient_id,
          token_id: patientToken
        });

      if (insertError) {
        console.error('Error storing patient token:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to create patient token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      patientToken = existingToken.token_id;
    }

    // Get patient information for de-identification
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('first_name, last_name, date_of_birth')
      .eq('id', patient_id)
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      console.error('Error fetching patient:', patientError);
      return new Response(JSON.stringify({ error: 'Patient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const patientName = `${patient.first_name} ${patient.last_name}`;
    const ageRange = patient.date_of_birth ? calculateAgeRange(patient.date_of_birth) : 'Unknown';

    // De-identify the data
    const response: DeIdentificationResponse = {
      patient_token: patientToken,
      age_range: ageRange,
      de_identified_text: conversation_text ? deIdentifyText(conversation_text, patientName, patientToken) : undefined,
      de_identified_context: patient_context ? deIdentifyObject(patient_context, patientName, patientToken) : undefined
    };

    console.log('Successfully de-identified data for', patientToken);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in de-identify-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});