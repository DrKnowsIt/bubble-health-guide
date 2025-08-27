import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export const exportComprehensivePDFForUser = async (
  selectedUser: User, 
  toastFn: typeof toast
) => {
  try {
    // Batch all database queries for better performance
    const [
      { data: memoryData },
      { data: easyChatData },
      { data: diagnosesData },
      { data: healthSummaries },
      { data: solutionsData }
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
        .order('created_at', { ascending: false })
        .limit(5),
      
      supabase
        .from('health_record_summaries')
        .select('created_at')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('conversation_solutions')
        .select('*')
        .eq('patient_id', selectedUser.id)
        .order('confidence', { ascending: false })
        .limit(8)
    ]);

    // Generate comprehensive PDF
    const doc = new (await import('jspdf')).default();
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
    currentY += 15;

    // Provider note
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Dear Healthcare Provider,', 20, currentY);
    currentY += 10;

    doc.setFont(undefined, 'normal');
    const providerNote = `This comprehensive report summarizes ${selectedUser.first_name}'s health information and AI-assisted analysis from our platform. The data includes patient-reported symptoms, historical health records, and AI-generated insights to support your clinical assessment.`;
    const splitNote = doc.splitTextToSize(providerNote, 170);
    doc.text(splitNote, 20, currentY);
    currentY += splitNote.length * 4 + 15;

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
        doc.text(`${index + 1}. ${diagnosis.diagnosis}`, 25, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');
        if (diagnosis.confidence) {
          doc.text(`Confidence: ${Math.round(diagnosis.confidence * 100)}%`, 30, currentY);
          currentY += 5;
        }

        if (diagnosis.reasoning) {
          const reasoningText = doc.splitTextToSize(`Reasoning: ${diagnosis.reasoning}`, 160);
          doc.text(reasoningText, 30, currentY);
          currentY += reasoningText.length * 4 + 3;
        }
        currentY += 3;
      });
      currentY += 10;
    }

    // Add AI Free Mode sessions summary
    if (easyChatData && easyChatData.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Recent AI Free Mode Sessions', 20, currentY);
      currentY += 10;

      easyChatData.forEach((session, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const sessionDate = new Date(session.created_at).toLocaleDateString();
        doc.text(`Session ${index + 1} - ${sessionDate}`, 25, currentY);
        currentY += 6;

        if (session.final_summary) {
          doc.setFont(undefined, 'normal');
          const summaryText = doc.splitTextToSize(session.final_summary, 160);
          doc.text(summaryText, 30, currentY);
          currentY += summaryText.length * 4 + 8;
        }
      });
      currentY += 10;
    }

    // Add solutions/recommendations
    if (solutionsData && solutionsData.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('AI-Generated Health Recommendations', 20, currentY);
      currentY += 10;

      solutionsData.forEach((solution, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${solution.category || 'General'}`, 25, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');
        if (solution.confidence) {
          doc.text(`Confidence: ${Math.round(solution.confidence * 100)}%`, 30, currentY);
          currentY += 5;
        }

        const solutionText = doc.splitTextToSize(solution.solution, 160);
        doc.text(solutionText, 30, currentY);
        currentY += solutionText.length * 4 + 8;
      });
      currentY += 10;
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
          currentY += summaryText.length * 4 + 8;
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