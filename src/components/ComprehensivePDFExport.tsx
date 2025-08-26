import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useComprehensiveHealthReport } from '@/hooks/useComprehensiveHealthReport';
import { useStrategicReferencing } from '@/hooks/useStrategicReferencing';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  is_pet?: boolean;
}

interface ComprehensivePDFExportProps {
  selectedUser?: User | null;
}

export const ComprehensivePDFExport: React.FC<ComprehensivePDFExportProps> = ({ selectedUser }) => {
  const { toast } = useToast();
  const { memories, insights } = useConversationMemory(selectedUser?.id);
  const { report } = useComprehensiveHealthReport(selectedUser);
  const { summaries, doctorNotes } = useStrategicReferencing(selectedUser?.id);

  const formatMemoryForPDF = () => {
    if (!memories.length && !insights.length) {
      return 'No conversation memory or insights available yet.';
    }

    let content = '';
    
    const isPet = selectedUser?.is_pet === true;
    
    if (insights.length > 0) {
      content += isPet ? 'PET HEALTH INSIGHTS:\n\n' : 'CLINICAL MEMORY INSIGHTS:\n\n';
      
      // Group insights by category for better organization
      const groupedInsights = insights.reduce((acc, insight) => {
        if (!acc[insight.category]) acc[insight.category] = [];
        acc[insight.category].push(insight);
        return acc;
      }, {} as Record<string, any[]>);
      
      Object.entries(groupedInsights).forEach(([category, categoryInsights]) => {
        content += `${category.toUpperCase().replace(/_/g, ' ')}:\n`;
        categoryInsights.forEach((insight) => {
          content += `• ${insight.key.replace(/_/g, ' ')}: ${insight.value}\n`;
          content += `  Recorded: ${new Date(insight.timestamp).toLocaleDateString()}\n`;
        });
        content += '\n';
      });
    }
    
    // Extract clinical information from memory
    if (memories.length > 0) {
      content += isPet ? 'DETAILED PET HISTORY:\n\n' : 'DETAILED PATIENT HISTORY:\n\n';
      memories.forEach((memory) => {
        if (memory.memory) {
          const mem = memory.memory;
          
          // Medical History (adjust for pets)
          if (mem.medical_history && mem.medical_history.length > 0) {
            content += isPet ? 'CONFIRMED HEALTH CONDITIONS:\n' : 'CONFIRMED MEDICAL CONDITIONS:\n';
            mem.medical_history.forEach((condition: string) => {
              content += `• ${condition}\n`;
            });
            content += '\n';
          }
          
          // Current Medications (adjust for pets)
          if (mem.current_medications && mem.current_medications.length > 0) {
            content += isPet ? 'CURRENT MEDICATIONS & TREATMENTS:\n' : 'CURRENT MEDICATIONS & SUPPLEMENTS:\n';
            mem.current_medications.forEach((med: string) => {
              content += `• ${med}\n`;
            });
            content += '\n';
          }
          
          // Symptoms with details (adjust for pets)
          if (mem.symptoms && Object.keys(mem.symptoms).length > 0) {
            content += isPet ? 'OBSERVED SYMPTOMS:\n' : 'DOCUMENTED SYMPTOMS:\n';
            Object.entries(mem.symptoms).forEach(([symptom, details]: [string, any]) => {
              content += `• ${symptom.toUpperCase()}:\n`;
              if (details.description) content += `  Description: ${details.description}\n`;
              if (details.onset) content += `  Onset: ${details.onset}\n`;
              if (details.severity) content += `  Severity: ${details.severity}\n`;
            });
            content += '\n';
          }
          
          // Lifestyle Factors (adjust for pets)
          if (mem.lifestyle_factors) {
            content += isPet ? 'BEHAVIORAL FACTORS:\n' : 'LIFESTYLE FACTORS:\n';
            Object.entries(mem.lifestyle_factors).forEach(([factor, info]: [string, any]) => {
              if (info) content += `• ${factor.replace(/_/g, ' ').toUpperCase()}: ${info}\n`;
            });
            content += '\n';
          }
          
          // Key Negatives (Important for clinical decision making)
          if (mem.key_negatives && mem.key_negatives.length > 0) {
            content += 'IMPORTANT NEGATIVE FINDINGS:\n';
            mem.key_negatives.forEach((negative: string) => {
              content += `• Patient denies: ${negative}\n`;
            });
            content += '\n';
          }
          
          // Care Preferences
          if (mem.care_preferences && mem.care_preferences.length > 0) {
            content += 'PATIENT CARE PREFERENCES:\n';
            mem.care_preferences.forEach((pref: string) => {
              content += `• ${pref}\n`;
            });
            content += '\n';
          }
          
          // Environmental Factors
          if (mem.environmental_factors && mem.environmental_factors.length > 0) {
            content += 'ENVIRONMENTAL EXPOSURES:\n';
            mem.environmental_factors.forEach((factor: string) => {
              content += `• ${factor}\n`;
            });
            content += '\n';
          }
          
          // High Confidence Topics (Recent diagnoses/concerns)
          if (mem.high_confidence_topics && mem.high_confidence_topics.length > 0) {
            content += 'CURRENT HIGH-CONFIDENCE HEALTH CONCERNS:\n';
            mem.high_confidence_topics.forEach((topic: string) => {
              content += `• ${topic}\n`;
            });
            content += '\n';
          }
          
          // Health Record Insights
          if (mem.health_record_insights && mem.health_record_insights.length > 0) {
            content += 'HEALTH RECORDS ANALYSIS:\n';
            mem.health_record_insights.forEach((insight: string) => {
              content += `• ${insight}\n`;
            });
            content += '\n';
          }
        }
        
        if (memory.summary) {
          content += `CONVERSATION SUMMARY (${new Date(memory.updated_at).toLocaleDateString()}):\n${memory.summary}\n\n`;
        }
      });
    }
    
    return content;
  };

  const formatHealthRecordSummaries = async () => {
    if (!selectedUser) return '';
    
    try {
      const { data: healthSummaries, error } = await supabase
        .from('health_record_summaries')
        .select(`
          summary_text,
          priority_level,
          created_at,
          health_records (
            title,
            record_type,
            category,
            created_at
          )
        `)
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false });

      if (error || !healthSummaries?.length) return '';

      let content = 'HEALTH RECORDS SUMMARY:\n\n';
      
      // Group by priority level
      const priorityGroups = {
        always: healthSummaries.filter(s => s.priority_level === 'always'),
        conditional: healthSummaries.filter(s => s.priority_level === 'conditional'),
        normal: healthSummaries.filter(s => s.priority_level === 'normal')
      };

      // Always priority (most important)
      if (priorityGroups.always.length > 0) {
        content += 'CRITICAL HEALTH INFORMATION (Always Reference):\n';
        priorityGroups.always.forEach((summary, index) => {
          const record = summary.health_records as any;
          content += `${index + 1}. ${record?.title || 'Health Record'} (${record?.record_type || 'Unknown Type'})\n`;
          content += `   Date: ${new Date(record?.created_at || summary.created_at).toLocaleDateString()}\n`;
          content += `   Summary: ${summary.summary_text}\n\n`;
        });
      }

      // Conditional priority (moderate importance)
      if (priorityGroups.conditional.length > 0) {
        content += 'CONDITIONAL HEALTH INFORMATION (Reference When Relevant):\n';
        priorityGroups.conditional.forEach((summary, index) => {
          const record = summary.health_records as any;
          content += `${index + 1}. ${record?.title || 'Health Record'} (${record?.record_type || 'Unknown Type'})\n`;
          content += `   Date: ${new Date(record?.created_at || summary.created_at).toLocaleDateString()}\n`;
          content += `   Summary: ${summary.summary_text}\n\n`;
        });
      }

      // Normal priority (background information)
      if (priorityGroups.normal.length > 0) {
        content += 'BACKGROUND HEALTH INFORMATION:\n';
        priorityGroups.normal.forEach((summary, index) => {
          const record = summary.health_records as any;
          content += `${index + 1}. ${record?.title || 'Health Record'} (${record?.record_type || 'Unknown Type'})\n`;
          content += `   Date: ${new Date(record?.created_at || summary.created_at).toLocaleDateString()}\n`;
          content += `   Summary: ${summary.summary_text}\n\n`;
        });
      }

      return content;
    } catch (error) {
      console.error('Error fetching health records:', error);
      return '';
    }
  };

  const formatEasyChatSessions = async () => {
    if (!selectedUser) return '';
    
    try {
      const { data: easyChatSessions, error } = await supabase
        .from('easy_chat_sessions')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !easyChatSessions?.length) return '';

      let content = 'EASY CHAT GUIDED CONVERSATIONS:\n\n';
      
      easyChatSessions.forEach((session, index) => {
        const sessionData = session.session_data as any;
        const conversationPath = sessionData?.conversation_path || [];
        const topics = sessionData?.topics_for_doctor || [];
        
        content += `SESSION ${index + 1} - ${new Date(session.created_at).toLocaleDateString()}:\n`;
        
        if (sessionData?.selected_anatomy && sessionData.selected_anatomy.length > 0) {
          content += `Body Areas of Focus: ${sessionData.selected_anatomy.join(', ')}\n`;
        }
        
        if (topics.length > 0) {
          content += `AI-IDENTIFIED HEALTH TOPICS:\n`;
          topics.forEach((topic: any) => {
            content += `• ${topic.topic}\n`;
            if (topic.confidence) {
              content += `  Confidence: ${Math.round(topic.confidence * 100)}%\n`;
            }
            if (topic.reasoning) {
              content += `  Reasoning: ${topic.reasoning}\n`;
            }
            content += `\n`;
          });
        } else {
          content += `CONVERSATION SUMMARY (${conversationPath.length} questions answered):\n`;
          content += `This guided conversation covered health concerns and symptoms.\n\n`;
        }
        
        if (session.final_summary) {
          content += `\nSESSION SUMMARY:\n${session.final_summary}\n`;
        }
        
        content += '\n' + '='.repeat(50) + '\n\n';
      });
      
      return content;
    } catch (error) {
      console.error('Error fetching Easy Chat sessions:', error);
      return '';
    }
  };

  const getLatestDiagnoses = async () => {
    if (!selectedUser) return '';
    
    try {
      const { data: diagnoses, error } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error || !diagnoses?.length) return '';

      let content = 'RECENT AI-IDENTIFIED HEALTH TOPICS:\n\n';
      
      // Group by confidence level
      const highConfidence = diagnoses.filter(d => d.confidence >= 0.7);
      const moderateConfidence = diagnoses.filter(d => d.confidence >= 0.5 && d.confidence < 0.7);
      const lowConfidence = diagnoses.filter(d => d.confidence < 0.5);

      if (highConfidence.length > 0) {
        content += 'HIGH CONFIDENCE TOPICS (≥70% confidence):\n';
        highConfidence.forEach((diag, index) => {
          content += `${index + 1}. ${diag.diagnosis}\n`;
          content += `   Confidence: ${Math.round(diag.confidence * 100)}%\n`;
          content += `   Reasoning: ${diag.reasoning}\n`;
          content += `   Identified: ${new Date(diag.updated_at).toLocaleDateString()}\n\n`;
        });
      }

      if (moderateConfidence.length > 0) {
        content += 'MODERATE CONFIDENCE TOPICS (50-69% confidence):\n';
        moderateConfidence.forEach((diag, index) => {
          content += `${index + 1}. ${diag.diagnosis}\n`;
          content += `   Confidence: ${Math.round(diag.confidence * 100)}%\n`;
          content += `   Reasoning: ${diag.reasoning}\n`;
          content += `   Identified: ${new Date(diag.updated_at).toLocaleDateString()}\n\n`;
        });
      }

      if (lowConfidence.length > 0) {
        content += 'LOWER CONFIDENCE TOPICS (<50% confidence):\n';
        lowConfidence.forEach((diag, index) => {
          content += `${index + 1}. ${diag.diagnosis}\n`;
          content += `   Confidence: ${Math.round(diag.confidence * 100)}%\n`;
          content += `   Reasoning: ${diag.reasoning}\n`;
          content += `   Identified: ${new Date(diag.updated_at).toLocaleDateString()}\n\n`;
        });
      }

      return content;
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      return '';
    }
  };

  const getSuggestedTests = (memories: any[], diagnoses: any[]) => {
    let content = 'SUGGESTED CLINICAL ASSESSMENTS:\n\n';
    
    // Based on high-confidence diagnoses and symptoms
    const symptoms = new Set<string>();
    const conditions = new Set<string>();
    
    // Extract symptoms from memory
    memories.forEach(memory => {
      if (memory.memory?.symptoms) {
        Object.keys(memory.memory.symptoms).forEach(symptom => symptoms.add(symptom.toLowerCase()));
      }
      if (memory.memory?.high_confidence_topics) {
        memory.memory.high_confidence_topics.forEach((topic: string) => conditions.add(topic.toLowerCase()));
      }
    });
    
    // Extract from diagnoses
    diagnoses.filter(d => d.confidence >= 0.6).forEach(diag => {
      conditions.add(diag.diagnosis.toLowerCase());
    });
    
    // Standard assessments
    content += 'STANDARD CLINICAL EVALUATION:\n';
    content += '• Complete medical history and physical examination\n';
    content += '• Vital signs (blood pressure, heart rate, temperature, respiratory rate)\n';
    content += '• Basic metabolic panel (BMP) and complete blood count (CBC)\n\n';
    
    // Symptom-based recommendations
    if (symptoms.has('chest pain') || symptoms.has('shortness of breath') || symptoms.has('palpitations')) {
      content += 'CARDIOVASCULAR ASSESSMENT (Based on reported symptoms):\n';
      content += '• Electrocardiogram (ECG)\n';
      content += '• Chest X-ray\n';
      content += '• Consider cardiac enzymes (troponin) if acute\n';
      content += '• Echocardiogram if indicated\n\n';
    }
    
    if (symptoms.has('headache') || symptoms.has('dizziness') || symptoms.has('confusion')) {
      content += 'NEUROLOGICAL ASSESSMENT (Based on reported symptoms):\n';
      content += '• Detailed neurological examination\n';
      content += '• Blood pressure monitoring\n';
      content += '• Consider CT/MRI if acute or concerning features\n\n';
    }
    
    if (symptoms.has('abdominal pain') || symptoms.has('nausea') || symptoms.has('vomiting')) {
      content += 'GASTROINTESTINAL ASSESSMENT (Based on reported symptoms):\n';
      content += '• Abdominal examination\n';
      content += '• Basic metabolic panel\n';
      content += '• Consider abdominal ultrasound or CT if indicated\n\n';
    }
    
    if (symptoms.has('fatigue') || symptoms.has('weight loss') || symptoms.has('weight gain')) {
      content += 'METABOLIC/ENDOCRINE SCREENING (Based on reported symptoms):\n';
      content += '• Thyroid function tests (TSH, T3, T4)\n';
      content += '• Hemoglobin A1C and fasting glucose\n';
      content += '• Complete metabolic panel\n';
      content += '• Consider vitamin D and B12 levels\n\n';
    }
    
    // Age-appropriate screenings
    content += 'AGE-APPROPRIATE PREVENTIVE CARE:\n';
    content += '• Cancer screenings per current guidelines\n';
    content += '• Immunization status review\n';
    content += '• Mental health screening\n';
    content += '• Substance use screening\n\n';
    
    // Follow-up recommendations
    content += 'FOLLOW-UP RECOMMENDATIONS:\n';
    content += '• Schedule appropriate follow-up based on findings\n';
    content += '• Consider specialist referral if indicated\n';
    content += '• Patient education on symptoms to monitor\n';
    content += '• Medication review and optimization\n\n';
    
    return content;
  };

  const addDisclaimerToPage = (doc: jsPDF, pageHeight: number) => {
    const disclaimerY = pageHeight - 25;
    doc.setFontSize(7);
    doc.setFont(undefined, 'italic');
    doc.text('DrKnowsIt AI-Generated Report - Not a substitute for professional medical advice.', 20, disclaimerY);
    doc.text('Please consult with your healthcare provider for medical decisions.', 20, disclaimerY + 4);
  };

  const addHeaderToPage = (doc: jsPDF) => {
    // DrKnowsIt Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('DrKnowsIt', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('AI-Powered Health Assistant | www.drknowsit.com', 20, 28);
    
    // Header line
    doc.line(20, 32, 190, 32);
  };

  const addProviderNote = (doc: jsPDF, startY: number): number => {
    let currentY = startY;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Dear Healthcare Provider,', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const providerNote = `This comprehensive health report has been generated by DrKnowsIt AI to assist you in understanding your patient's health concerns and symptom patterns. The system continuously analyzes patient conversations, health forms, family history, and symptoms to identify potential correlations and track health progression over time.

REPORT CONTENTS:
• Patient-reported symptom timeline with progression patterns
• AI-identified health topics organized by confidence levels (≥70% = high confidence)
• Detailed conversation memory including medications, symptoms, and lifestyle factors
• Health record summaries with clinical relevance prioritization
• Suggested clinical assessments based on reported symptoms and concerns

CLINICAL UTILITY:
This report can help identify patterns that may not be immediately apparent in routine visits. The AI tracks symptom evolution, medication changes, and lifestyle factors that may influence health outcomes. High-confidence topics represent patterns with strong evidence from multiple conversations and should be prioritized for clinical evaluation.

DATA RELIABILITY:
• All information is patient-reported and should be verified through clinical assessment
• AI analysis provides correlation suggestions, not definitive diagnoses  
• Symptom tracking spans multiple conversations and provides temporal context
• Medication lists include patient-reported supplements and over-the-counter medications
• Family history and environmental factors are included when relevant

RECOMMENDED APPROACH:
1. Review high-confidence topics first - these represent the most consistent patient concerns
2. Cross-reference AI suggestions with your clinical assessment
3. Use the symptom timeline to understand progression and triggers
4. Consider the suggested clinical assessments based on reported symptom patterns
5. Address any red flag symptoms identified in the urgent attention section

LIMITATIONS:
This AI system cannot replace clinical judgment and may miss important clinical nuances. Emergency situations require immediate medical evaluation regardless of AI analysis. The system is designed to supplement, not substitute, professional medical assessment.

We appreciate your time in reviewing this information and hope it provides valuable insights into your patient's health journey.`;
    
    const splitNote = doc.splitTextToSize(providerNote, 170);
    doc.text(splitNote, 20, currentY);
    currentY += splitNote.length * 3.5 + 15;
    
    return currentY;
  };

  const exportComprehensivePDF = async () => {
    if (!selectedUser) {
      toast({
        title: "No User Selected",
        description: "Please select a user to export their comprehensive report.",
        variant: "destructive"
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const userName = `${selectedUser.first_name} ${selectedUser.last_name}`;
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      let currentY = 40;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Page 1: Cover page with provider letter
      addHeaderToPage(doc);
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('COMPREHENSIVE HEALTH REPORT', 20, currentY);
      doc.setFontSize(14);
      doc.text('For Healthcare Provider Review', 20, currentY + 10);
      currentY += 25;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Patient: ${userName}`, 20, currentY);
      doc.text(`Report Generated: ${currentDate}`, 20, currentY + 7);
      doc.text(`Generated by: DrKnowsIt AI Health Tracking System`, 20, currentY + 14);
      currentY += 30;
      
      // Enhanced provider letter
      currentY = addProviderNote(doc, currentY);
      addDisclaimerToPage(doc, pageHeight);
      
      // Page 2: Clinical Summary & Health Status
      if (report) {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('EXECUTIVE CLINICAL SUMMARY', 20, currentY);
        currentY += 15;
        
        // Overall Status with visual indicators
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const statusText = `Overall Health Status: ${report.overall_health_status.toUpperCase()}`;
        const priorityText = `Priority Level: ${report.priority_level.toUpperCase()}`;
        doc.text(statusText, 20, currentY);
        doc.text(priorityText, 20, currentY + 7);
        
        // Add confidence score if available
        if (report.confidence_score) {
          doc.text(`Report Confidence: ${Math.round(report.confidence_score * 100)}%`, 20, currentY + 14);
          currentY += 25;
        } else {
          currentY += 20;
        }
        
        // Executive Summary (report_summary)
        if (report.report_summary) {
          doc.setFont(undefined, 'bold');
          doc.text('EXECUTIVE SUMMARY:', 20, currentY);
          currentY += 7;
          doc.setFont(undefined, 'normal');
          const splitSummary = doc.splitTextToSize(report.report_summary, 170);
          doc.text(splitSummary, 20, currentY);
          currentY += splitSummary.length * 4 + 10;
        }
        
        // Key Concerns (prioritized)
        if (report.key_concerns && report.key_concerns.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text('PRIMARY CLINICAL CONCERNS:', 20, currentY);
          currentY += 7;
          doc.setFont(undefined, 'normal');
          report.key_concerns.forEach((concern, index) => {
            const splitConcern = doc.splitTextToSize(`${index + 1}. ${concern}`, 170);
            doc.text(splitConcern, 25, currentY);
            currentY += splitConcern.length * 4 + 2;
          });
          currentY += 8;
        }
        
        // Clinical Recommendations
        if (report.recommendations && report.recommendations.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text('CLINICAL RECOMMENDATIONS:', 20, currentY);
          currentY += 7;
          doc.setFont(undefined, 'normal');
          report.recommendations.forEach((rec, index) => {
            const splitRec = doc.splitTextToSize(`${index + 1}. ${rec}`, 170);
            doc.text(splitRec, 25, currentY);
            currentY += splitRec.length * 4 + 3;
          });
          currentY += 8;
        }
        
        // Check if we need a new page
        if (currentY > pageHeight - 60) {
          doc.addPage();
          addHeaderToPage(doc);
          currentY = 40;
        }
        
        // Health Metrics with clinical context
        if (report.health_metrics_summary) {
          const metrics = report.health_metrics_summary;
          
          doc.setFont(undefined, 'bold');
          doc.text('CLINICAL ASSESSMENT SUMMARY:', 20, currentY);
          currentY += 10;
          
          if (metrics.strengths && metrics.strengths.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Positive Health Indicators:', 25, currentY);
            currentY += 6;
            doc.setFont(undefined, 'normal');
            metrics.strengths.forEach((strength) => {
              const splitStrength = doc.splitTextToSize(`• ${strength}`, 165);
              doc.text(splitStrength, 30, currentY);
              currentY += splitStrength.length * 4 + 1;
            });
            currentY += 5;
          }
          
          if (metrics.areas_for_improvement && metrics.areas_for_improvement.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Areas Requiring Clinical Attention:', 25, currentY);
            currentY += 6;
            doc.setFont(undefined, 'normal');
            metrics.areas_for_improvement.forEach((area) => {
              const splitArea = doc.splitTextToSize(`• ${area}`, 165);
              doc.text(splitArea, 30, currentY);
              currentY += splitArea.length * 4 + 1;
            });
            currentY += 5;
          }
          
          if (metrics.borderline_values && metrics.borderline_values.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Values Requiring Monitoring:', 25, currentY);
            currentY += 6;
            doc.setFont(undefined, 'normal');
            metrics.borderline_values.forEach((value) => {
              const splitValue = doc.splitTextToSize(`• ${value}`, 165);
              doc.text(splitValue, 30, currentY);
              currentY += splitValue.length * 4 + 1;
            });
          }
        }
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Page 3: Detailed Health Records Analysis
      const healthRecordsContent = await formatHealthRecordSummaries();
      if (healthRecordsContent.trim()) {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('HEALTH RECORDS ANALYSIS', 20, currentY);
        currentY += 15;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const splitHealthRecords = doc.splitTextToSize(healthRecordsContent, 170);
        doc.text(splitHealthRecords, 20, currentY);
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Page 4: AI-Identified Health Topics and Diagnoses
      const diagnosesContent = await getLatestDiagnoses();
      if (diagnosesContent.trim()) {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('AI-IDENTIFIED HEALTH TOPICS', 20, currentY);
        currentY += 12;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Note: These topics are generated by AI analysis of patient conversations and should be validated through clinical assessment.', 20, currentY);
        currentY += 10;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const splitDiagnoses = doc.splitTextToSize(diagnosesContent, 170);
        doc.text(splitDiagnoses, 20, currentY);
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Page 4.5: Easy Chat Sessions
      const easyChatContent = await formatEasyChatSessions();
      if (easyChatContent.trim()) {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('EASY CHAT GUIDED CONVERSATIONS', 20, currentY);
        currentY += 12;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Structured health conversations conducted through DrKnowsIt\'s Easy Chat feature.', 20, currentY);
        currentY += 10;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const splitEasyChat = doc.splitTextToSize(easyChatContent, 170);
        doc.text(splitEasyChat, 20, currentY);
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Page 5: Comprehensive Patient Memory & History
      const memoryContent = formatMemoryForPDF();
      if (memoryContent && memoryContent.trim() && memoryContent !== 'No conversation memory or insights available yet.') {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('DETAILED PATIENT HISTORY & MEMORY', 20, currentY);
        currentY += 15;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const splitMemory = doc.splitTextToSize(memoryContent, 170);
        
        // Handle multiple pages if content is too long
        let remainingContent = [...splitMemory];
        while (remainingContent.length > 0) {
          const maxLinesPerPage = Math.floor((pageHeight - currentY - 30) / 4);
          const currentPageContent = remainingContent.splice(0, maxLinesPerPage);
          doc.text(currentPageContent, 20, currentY);
          
          if (remainingContent.length > 0) {
            addDisclaimerToPage(doc, pageHeight);
            doc.addPage();
            addHeaderToPage(doc);
            currentY = 40;
          }
        }
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Page 6: Clinical Assessment Suggestions
      const testSuggestions = getSuggestedTests(memories, await getLatestDiagnosesData());
      if (testSuggestions.trim()) {
        doc.addPage();
        addHeaderToPage(doc);
        currentY = 40;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('SUGGESTED CLINICAL ASSESSMENTS', 20, currentY);
        currentY += 12;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Based on patient-reported symptoms and AI analysis. Use clinical judgment to determine appropriate tests.', 20, currentY);
        currentY += 10;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const splitTests = doc.splitTextToSize(testSuggestions, 170);
        doc.text(splitTests, 20, currentY);
        
        addDisclaimerToPage(doc, pageHeight);
      }
      
      // Final page: Enhanced medical disclaimer
      doc.addPage();
      addHeaderToPage(doc);
      currentY = 40;
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('IMPORTANT MEDICAL DISCLAIMER', 20, currentY);
      currentY += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const disclaimer = `This comprehensive health report is generated by DrKnowsIt AI and is intended solely as a supplementary tool for healthcare providers. It should be used in conjunction with, but never as a replacement for, professional medical judgment and clinical assessment.

KEY LIMITATIONS AND CONSIDERATIONS:
• Patient-Reported Data: All information is based on patient self-reports and has not been clinically verified
• AI Analysis Limitations: The system may miss critical clinical details or create false correlations
• No Diagnostic Authority: This report cannot diagnose medical conditions or provide treatment recommendations
• Emergency Situations: Urgent medical conditions require immediate clinical evaluation, not AI analysis
• Temporal Accuracy: Symptom timelines and medication lists depend on patient recall accuracy

CLINICAL USE RECOMMENDATIONS:
• Use as supplementary information to enhance clinical interviews and assessments
• Verify all patient-reported information through standard clinical protocols
• Consider AI suggestions as potential areas for investigation, not clinical conclusions
• Prioritize high-confidence topics for clinical evaluation while maintaining diagnostic independence
• Cross-reference AI patterns with established clinical guidelines and patient presentation

DATA PRIVACY AND SECURITY:
• All patient data is encrypted and HIPAA-compliant
• Information sharing follows standard healthcare privacy protocols
• Patients maintain full control over their health data

PROVIDER RESPONSIBILITIES:
• Conduct independent clinical assessment regardless of AI recommendations
• Document your own clinical findings and decisions
• Use professional medical judgment in all treatment decisions
• Ensure patient safety through standard medical protocols

CONTACT INFORMATION:
For technical questions about this AI system: support@drknowsit.com
For medical emergencies: Direct patients to call 911 or visit nearest emergency room

This report was generated on ${currentDate} using DrKnowsIt AI Health Assistant v3.0
Patient: ${userName} | Provider Copy | Confidential Medical Information`;
      
      const splitDisclaimer = doc.splitTextToSize(disclaimer, 170);
      doc.text(splitDisclaimer, 20, currentY);
      
      // Save the PDF with enhanced filename
      const fileName = `DrKnowsIt_Clinical_Report_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Clinical Report Exported",
        description: "Comprehensive clinical health report has been downloaded successfully.",
      });
      
    } catch (error) {
      console.error('Error generating comprehensive PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate clinical report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Helper function to get diagnoses data for test suggestions
  const getLatestDiagnosesData = async () => {
    if (!selectedUser) return [];
    
    try {
      const { data: diagnoses } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      return diagnoses || [];
    } catch (error) {
      return [];
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <FileDown className="h-5 w-5" />
          Comprehensive PDF Export
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Export a comprehensive clinical report including detailed patient history, AI analysis, health record summaries, and suggested clinical assessments for healthcare provider review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Enhanced Clinical Report</p>
            <p>This comprehensive report includes detailed patient history, symptom tracking, medication lists, AI-identified health topics, suggested clinical assessments, and professional medical disclaimers designed for healthcare provider review and clinical decision support.</p>
          </div>
        </div>
        
        <Button 
          onClick={exportComprehensivePDF}
          disabled={!selectedUser}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export Clinical Report
        </Button>
        
        {!selectedUser && (
          <p className="text-sm text-muted-foreground text-center">
            Please select a user to export their clinical report
          </p>
        )}
      </CardContent>
    </Card>
  );
};