import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FinalMedicalAnalysis } from '@/hooks/useFinalMedicalAnalysis';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
}

// Standardized spacing constants for consistent PDF formatting
const SPACING = {
  SMALL: 5,
  MEDIUM: 8,
  LARGE: 12,
  SECTION: 15,
  LINE: 6
} as const;

// Text sanitization function to prevent PDF corruption
const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove problematic characters that can corrupt PDFs
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Control characters
    // Normalize common characters
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/–/g, '-') // Normalize dashes
    .replace(/…/g, '...') // Normalize ellipsis
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

// Deduplicate solutions by category, keeping the most confident and recent
const deduplicateSolutions = (solutions: any[]): any[] => {
  const solutionMap = new Map();
  
  solutions.forEach(solution => {
    const category = solution.category || 'general';
    const existing = solutionMap.get(category);
    
    if (!existing || 
        solution.confidence > existing.confidence || 
        (solution.confidence === existing.confidence && 
         new Date(solution.created_at) > new Date(existing.created_at))) {
      solutionMap.set(category, solution);
    }
  });
  
  return Array.from(solutionMap.values())
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 6); // Limit to 6 diverse solutions
};

export const exportComprehensivePDFForUser = async (
  selectedUser: User, 
  toastFn: typeof toast,
  finalAnalysis?: FinalMedicalAnalysis | null
) => {
  try {
    // Batch all database queries for better performance
    const [
      { data: memoryData },
      { data: easyChatData },
      { data: diagnosesData },
      { data: healthSummaries },
      { data: solutionsData },
      { data: comprehensiveReport }
    ] = await Promise.all([
      supabase
        .from('conversation_memory')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false }),
      
      supabase
        .from('easy_chat_sessions')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .order('confidence', { ascending: false })
        .limit(5),
      
      supabase
        .from('health_record_summaries')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('conversation_solutions')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .not('confidence', 'eq', 0.9)
        .order('created_at', { ascending: false })
        .limit(8),
      
      supabase
        .from('comprehensive_health_reports')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Generate comprehensive PDF
    const doc = new (await import('jspdf')).default();
    doc.setCharSpace(0); // Fix excessive character spacing between letters
    const userName = `${selectedUser.first_name} ${selectedUser.last_name}`;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    let currentY = 40;

    // Add header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('DrKnowsIt', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('AI-Powered Health Assistant | www.drknowsit.com', 20, 28);
    doc.line(20, 32, 190, 32);

    // Report title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Comprehensive Clinical Health Report', 20, currentY);
    currentY += 15;

    // Patient info
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Patient: ${userName}`, 20, currentY);
    currentY += 6;
    doc.text(`Generated: ${currentDate}`, 20, currentY);
    currentY += 12;

    // Provider note
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Dear Healthcare Provider,', 20, currentY);
    currentY += 10;

    doc.setFont(undefined, 'normal');
    const providerNote = `This comprehensive report summarizes ${selectedUser.first_name}'s health information and AI-assisted analysis from our platform. The data includes patient-reported symptoms, historical health records, and AI-generated insights to support your clinical assessment.`;
    const splitNote = doc.splitTextToSize(providerNote, 170);
    doc.text(splitNote, 20, currentY);
    currentY += splitNote.length * 12 + 12;

    // Add diagnoses section
    if (diagnosesData && diagnosesData.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('AI-Identified Health Concerns', 20, currentY);
      currentY += 10;

      diagnosesData.forEach((diagnosis, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const diagnosisTitle = doc.splitTextToSize(`${index + 1}. ${diagnosis.diagnosis}`, 160);
        doc.text(diagnosisTitle, 25, currentY);
        currentY += diagnosisTitle.length * 12 + 6;

        doc.setFont(undefined, 'normal');
        if (diagnosis.confidence) {
          doc.text(`Confidence: ${Math.round(diagnosis.confidence * 100)}%`, 30, currentY);
          currentY += 5;
        }

        if (diagnosis.reasoning) {
          const reasoningText = doc.splitTextToSize(`Reasoning: ${sanitizeText(diagnosis.reasoning)}`, 160);
          doc.text(reasoningText, 30, currentY);
          currentY += reasoningText.length * 12 + 3;
        }
        currentY += SPACING.LINE;
      });
      currentY += 10;
    }

    // Add AI Free Mode sessions summary - Only show completed sessions with meaningful content
    if (easyChatData && easyChatData.length > 0) {
      // Filter to only show completed sessions with meaningful final summaries
      const completedSessions = easyChatData.filter(session => 
        session.completed && 
        session.final_summary && 
        session.final_summary.trim() !== '' &&
        !session.final_summary.toLowerCase().includes('session abandoned')
      );

      if (completedSessions.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Recent AI Health Assessments', 20, currentY);
        currentY += 10;

        completedSessions.forEach((session, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const sessionDate = new Date(session.created_at).toLocaleDateString();
          doc.text(`Assessment ${index + 1} - ${sessionDate}`, 25, currentY);
          currentY += 6;

          doc.setFont(undefined, 'normal');
          const summaryText = doc.splitTextToSize(session.final_summary, 160);
          doc.text(summaryText, 30, currentY);
          currentY += summaryText.length * 12 + 6;
        });
        currentY += 10;
      }
    }

    // Add recommended tests for healthcare providers
    if (comprehensiveReport?.recommended_tests && Array.isArray(comprehensiveReport.recommended_tests) && comprehensiveReport.recommended_tests.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Recommended Diagnostic Tests', 20, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('For Healthcare Provider Consideration', 20, currentY);
      currentY += 15;

      comprehensiveReport.recommended_tests.forEach((test: any, index: number) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${test.test_name}`, 25, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');
        if (test.test_code) {
          doc.text(`Code: ${test.test_code}`, 30, currentY);
          currentY += 5;
        }

        if (test.category) {
          doc.text(`Category: ${test.category}`, 30, currentY);
          currentY += 5;
        }

        if (test.urgency) {
          doc.text(`Urgency: ${test.urgency}`, 30, currentY);
          currentY += 5;
        }

        if (test.reason) {
          const reasonText = doc.splitTextToSize(`Clinical Rationale: ${test.reason}`, 160);
          doc.text(reasonText, 30, currentY);
          currentY += reasonText.length * 12 + 3;
        }

        if (test.confidence) {
          doc.text(`AI Confidence: ${Math.round(test.confidence * 100)}%`, 30, currentY);
          currentY += 5;
        }

        if (test.estimated_cost_range) {
          doc.text(`Est. Cost: ${test.estimated_cost_range}`, 30, currentY);
          currentY += 5;
        }

        if (test.patient_prep_required) {
          doc.text('Patient Preparation: Required', 30, currentY);
          currentY += 5;
        }

        if (test.contraindications && test.contraindications.length > 0) {
          const contraindicationsText = doc.splitTextToSize(`Contraindications: ${test.contraindications.join(', ')}`, 160);
          doc.text(contraindicationsText, 30, currentY);
          currentY += contraindicationsText.length * 12 + 3;
        }

        currentY += 6;
      });
      currentY += 10;
    }

    // Add Final AI Analysis if available (prioritized)
    if (finalAnalysis) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Final AI Medical Analysis', 20, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Comprehensive AI Review of All Available Data', 20, currentY);
      currentY += 15;

      // Analysis Summary
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Summary', 25, currentY);
      currentY += SPACING.MEDIUM;
      doc.setFont(undefined, 'normal');
      const summaryText = doc.splitTextToSize(sanitizeText(finalAnalysis.analysis_summary), 160);
      doc.text(summaryText, 25, currentY);
      currentY += summaryText.length * 12 + SPACING.LARGE;

      // Priority Level & Confidence
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`Priority Level: ${finalAnalysis.priority_level.toUpperCase()}`, 25, currentY);
      currentY += 6;
      doc.text(`AI Confidence: ${Math.round((finalAnalysis.confidence_score || 0) * 100)}%`, 25, currentY);
      currentY += 15;

      // Key Findings
      if (finalAnalysis.key_findings && finalAnalysis.key_findings.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Key Clinical Findings', 25, currentY);
        currentY += 10;

        // Sort findings by confidence score (highest first)
        const sortedFindings = [...finalAnalysis.key_findings].sort((a, b) => 
          (b.confidence || 0) - (a.confidence || 0)
        );

        sortedFindings.forEach((finding, index) => {
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const findingTitle = doc.splitTextToSize(`${index + 1}. ${finding.finding}`, 155);
          doc.text(findingTitle, 30, currentY);
          currentY += findingTitle.length * 12 + 6;

          doc.setFont(undefined, 'normal');
          doc.text(`Confidence: ${Math.round((finding.confidence || 0) * 100)}%`, 35, currentY);
          currentY += 5;

          if (finding.evidence) {
            const evidenceText = doc.splitTextToSize(`Evidence: ${sanitizeText(finding.evidence)}`, 155);
            doc.text(evidenceText, 35, currentY);
            currentY += evidenceText.length * 12 + SPACING.SMALL;
          }

          if (finding.significance) {
            const significanceText = doc.splitTextToSize(`Clinical Significance: ${sanitizeText(finding.significance)}`, 155);
            doc.text(significanceText, 35, currentY);
            currentY += significanceText.length * 12 + SPACING.LINE;
          }
        });
        currentY += 10;
      }

      // Enhanced Doctor Test Recommendations
      if (finalAnalysis.doctor_test_recommendations && finalAnalysis.doctor_test_recommendations.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('AI-Recommended Diagnostic Tests', 25, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('Based on Comprehensive Data Analysis', 25, currentY);
        currentY += 12;

        // Sort recommendations by confidence score (highest first)
        const sortedRecommendations = [...finalAnalysis.doctor_test_recommendations].sort((a, b) => 
          (b.confidence || 0) - (a.confidence || 0)
        );

        sortedRecommendations.forEach((test, index) => {
          if (currentY > 240) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}. ${test.test_name}`, 30, currentY);
          currentY += 6;

          doc.setFont(undefined, 'normal');
          if (test.test_code) {
            doc.text(`Code: ${test.test_code}`, 35, currentY);
            currentY += 5;
          }

          doc.text(`Category: ${test.category} | Urgency: ${test.urgency}`, 35, currentY);
          currentY += 5;

          doc.text(`AI Confidence: ${Math.round((test.confidence || 0) * 100)}%`, 35, currentY);
          currentY += 5;

          if (test.reason) {
            const reasonText = doc.splitTextToSize(`Rationale: ${test.reason}`, 155);
            doc.text(reasonText, 35, currentY);
            currentY += reasonText.length * 12 + 3;
          }

          if (test.estimated_cost_range) {
            doc.text(`Estimated Cost: ${test.estimated_cost_range}`, 35, currentY);
            currentY += 5;
          }

          if (test.patient_prep_required) {
            doc.text('Patient Preparation: Required', 35, currentY);
            currentY += 5;
          }

          if (test.contraindications && test.contraindications.length > 0) {
            const contraindicationsText = doc.splitTextToSize(`Contraindications: ${test.contraindications.join(', ')}`, 155);
            doc.text(contraindicationsText, 35, currentY);
            currentY += contraindicationsText.length * 12 + 3;
          }

          currentY += 6;
        });
        currentY += 10;
      }

      // Risk Assessment
      if (finalAnalysis.risk_assessment) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Risk Assessment', 25, currentY);
        currentY += 8;
        doc.setFont(undefined, 'normal');
        const riskText = doc.splitTextToSize(finalAnalysis.risk_assessment, 160);
        doc.text(riskText, 25, currentY);
        currentY += riskText.length * 12 + 12;
      }

      // Holistic Assessment
      if (finalAnalysis.holistic_assessment) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Holistic Health Assessment', 25, currentY);
        currentY += 8;
        doc.setFont(undefined, 'normal');
        const holisticText = doc.splitTextToSize(finalAnalysis.holistic_assessment, 160);
        doc.text(holisticText, 25, currentY);
        currentY += holisticText.length * 12 + 12;
      }

      // Follow-up Recommendations
      if (finalAnalysis.follow_up_recommendations && finalAnalysis.follow_up_recommendations.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Follow-up Recommendations', 25, currentY);
        currentY += 8;
        doc.setFont(undefined, 'normal');
        finalAnalysis.follow_up_recommendations.forEach((rec, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(`${index + 1}. ${rec}`, 30, currentY);
          currentY += 6;
        });
        currentY += 10;
      }

      // Data Sources Analyzed
      if (finalAnalysis.data_sources_analyzed) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Data Sources Analyzed:', 25, currentY);
        currentY += 6;
        doc.setFont(undefined, 'normal');
        const sources = finalAnalysis.data_sources_analyzed;
        doc.text(`• Conversation Memories: ${sources.conversation_memories || 0}`, 30, currentY);
        currentY += 5;
        doc.text(`• AI Diagnoses: ${sources.diagnoses || 0}`, 30, currentY);
        currentY += 5;
        doc.text(`• Treatment Solutions: ${sources.solutions || 0}`, 30, currentY);
        currentY += 5;
        doc.text(`• Health Records: ${sources.health_records || 0}`, 30, currentY);
        currentY += 5;
        doc.text(`• Health Insights: ${sources.insights || 0}`, 30, currentY);
        currentY += 15;
      }
    }
    
    // Add comprehensive report as fallback if no final analysis
    else if (comprehensiveReport) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Comprehensive Health Assessment Summary', 20, currentY);
      currentY += 10;

      if (comprehensiveReport.overall_health_status) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Overall Health Status: ${comprehensiveReport.overall_health_status}`, 25, currentY);
        currentY += 8;
      }

      if (comprehensiveReport.priority_level) {
        doc.setFont(undefined, 'bold');
        doc.text(`Priority Level: ${comprehensiveReport.priority_level}`, 25, currentY);
        currentY += 8;
      }

      if (comprehensiveReport.key_concerns && comprehensiveReport.key_concerns.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Key Concerns:', 25, currentY);
        currentY += 6;
        doc.setFont(undefined, 'normal');
        comprehensiveReport.key_concerns.forEach((concern: string, index: number) => {
          doc.text(`• ${concern}`, 30, currentY);
          currentY += 5;
        });
        currentY += 5;
      }

      if (comprehensiveReport.report_summary) {
        doc.setFont(undefined, 'bold');
        doc.text('Clinical Summary:', 25, currentY);
        currentY += 6;
        doc.setFont(undefined, 'normal');
        const summaryText = doc.splitTextToSize(comprehensiveReport.report_summary, 160);
        doc.text(summaryText, 25, currentY);
        currentY += summaryText.length * 12 + 10;
      }
    }

    // Add holistic solutions/recommendations
    if (solutionsData && solutionsData.length > 0) {
      // Deduplicate and improve solution variety
      const deduplicatedSolutions = deduplicateSolutions(solutionsData);
      
      if (deduplicatedSolutions.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Holistic Health Recommendations', 20, currentY);
        currentY += SPACING.MEDIUM;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('AI-Generated Patient Guidance', 20, currentY);
        currentY += SPACING.LARGE;

        deduplicatedSolutions.forEach((solution, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const categoryText = solution.category || 'General Wellness';
          doc.text(`${index + 1}. ${categoryText}`, 25, currentY);
          currentY += SPACING.LINE;

          doc.setFont(undefined, 'normal');
          if (solution.confidence) {
            doc.text(`Confidence: ${Math.round(solution.confidence * 100)}%`, 30, currentY);
            currentY += SPACING.SMALL;
          }

          const solutionText = doc.splitTextToSize(sanitizeText(solution.solution), 160);
          doc.text(solutionText, 30, currentY);
          currentY += solutionText.length * 12 + SPACING.LINE;
        });
        currentY += SPACING.MEDIUM;
      }
    }

    // Add memory insights if available
    if (memoryData && memoryData.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Conversation Memory & Context', 20, currentY);
      currentY += 10;

      memoryData.slice(0, 3).forEach((memory, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        if (memory.summary) {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const memoryDate = new Date(memory.updated_at).toLocaleDateString();
          doc.text(`Memory ${index + 1} - ${memoryDate}`, 25, currentY);
          currentY += 6;

          doc.setFont(undefined, 'normal');
          const summaryText = doc.splitTextToSize(memory.summary, 160);
          doc.text(summaryText, 30, currentY);
          currentY += summaryText.length * 12 + 6;
        }
      });
      currentY += 10;
    }

    // Add disclaimer
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Important Medical Disclaimer', 20, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const disclaimer = `This report is generated by AI and is intended for informational purposes only. It should not replace professional medical advice, diagnosis, or treatment. The AI analysis is based on patient-reported information and may not reflect the complete clinical picture. Please use this information as a supplementary tool in your clinical assessment and always rely on your professional judgment and additional diagnostic methods as appropriate.

All data in this report was collected through patient interactions with our AI system. The confidence scores and reasoning provided are algorithmic assessments and should be interpreted within the context of your clinical expertise.

For questions about this report or our AI system, please contact our support team.

Generated on ${currentDate} by DrKnowsIt AI Health Assistant`;

    const disclaimerLines = doc.splitTextToSize(disclaimer, 170);
    doc.text(disclaimerLines, 20, currentY);

    // Save the PDF
    const fileName = `${userName.replace(/\s+/g, '_')}_Health_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    toastFn({
      title: "PDF Generated",
      description: `Comprehensive health report for ${userName} has been downloaded.`,
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    toastFn({
      variant: "destructive",
      title: "Error",
      description: "Failed to generate PDF report. Please try again.",
    });
  }
};