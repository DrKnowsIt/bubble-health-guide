import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileDown, X, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface AIFreeModeCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewChat: () => void;
  sessionData: {
    selectedAnatomy: string[];
    conversationPath: any[];
    healthTopics: any[];
    finalSummary?: string;
  };
}

export const AIFreeModeCompletionModal = ({ 
  isOpen, 
  onClose, 
  onStartNewChat, 
  sessionData 
}: AIFreeModeCompletionModalProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = 190;
      const pageHeight = 270;
      let currentY = 30;

      // Header with Domain and Professional Branding
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text('DrKnowsIt.ai', 20, 20);
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('AI Free Mode Health Summary', 20, 30);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 38);
      doc.text('Website: www.drknowsit.ai | AI-Powered Health Guidance', 20, 43);
      doc.line(20, 47, pageWidth, 47);

      currentY = 55;

      // Note to Healthcare Provider
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Note to Healthcare Provider:', 20, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const doctorNote = `This document contains AI-generated insights from a guided health conversation conducted on DrKnowsIt.ai. The patient completed an interactive questionnaire focusing on their symptoms and concerns. This summary is provided to assist in your clinical evaluation and should be used alongside your professional medical assessment. The AI analysis includes potential health topics and confidence levels for your consideration.`;
      const splitDoctorNote = doc.splitTextToSize(doctorNote, pageWidth - 20);
      doc.text(splitDoctorNote, 20, currentY);
      currentY += splitDoctorNote.length * 4 + 10;

      // Selected Body Areas
      if (sessionData.selectedAnatomy.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Selected Body Areas:', 20, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const anatomyText = sessionData.selectedAnatomy
          .map(area => area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
          .join(', ');
        doc.text(anatomyText, 20, currentY);
        currentY += 15;
      }

      // Session Summary
      if (sessionData.finalSummary) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Health Analysis Summary:', 20, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const splitSummary = doc.splitTextToSize(sessionData.finalSummary, pageWidth - 20);
        doc.text(splitSummary, 20, currentY);
        currentY += splitSummary.length * 4 + 15;
      }

      // Detailed Conversation Transcript (Q&A)
      if (sessionData.conversationPath.length > 0) {
        // Check if we need a new page
        if (currentY + 50 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Conversation Transcript:', 20, currentY);
        currentY += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Questions and responses from your guided health conversation:', 20, currentY);
        currentY += 10;

        sessionData.conversationPath.forEach((item, index) => {
          if (currentY + 25 > pageHeight) {
            doc.addPage();
            currentY = 20;
          }

          // Question
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          const questionText = `Q${index + 1}: ${item.question?.question_text || 'Question not available'}`;
          const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 20);
          doc.text(splitQuestion, 20, currentY);
          currentY += splitQuestion.length * 4 + 2;

          // Answer
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const answerText = `A${index + 1}: ${item.response}`;
          const splitAnswer = doc.splitTextToSize(answerText, pageWidth - 20);
          doc.text(splitAnswer, 20, currentY);
          currentY += splitAnswer.length * 4 + 8;
        });

        currentY += 5;
      }

      // AI Analysis & Potential Health Topics  
      if (sessionData.healthTopics.length > 0) {
        // Check if we need a new page
        if (currentY + 50 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('AI Health Analysis Results:', 20, currentY);
        currentY += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Potential health topics identified from your conversation (for discussion with your doctor):', 20, currentY);
        currentY += 10;

        sessionData.healthTopics.forEach((topic, index) => {
          if (currentY + 25 > pageHeight) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const confidenceLevel = Math.round(topic.confidence * 100);
          // Ensure confidence is never 100%
          const displayConfidence = confidenceLevel >= 100 ? 95 : confidenceLevel;
          doc.text(`${index + 1}. ${topic.topic}`, 20, currentY);
          currentY += 5;

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.text(`AI Confidence: ${displayConfidence}% (Not a definitive diagnosis)`, 25, currentY);
          currentY += 4;

          if (topic.reasoning) {
            const splitReasoning = doc.splitTextToSize(`Clinical Reasoning: ${topic.reasoning}`, pageWidth - 25);
            doc.text(splitReasoning, 25, currentY);
            currentY += splitReasoning.length * 3 + 2;
          }

          doc.setFontSize(8);
          doc.setFont(undefined, 'italic');
          doc.text(`Category: ${topic.category || 'General'}`, 25, currentY);
          currentY += 8;
        });
      }

      // Wellness Recommendations Section
      if (sessionData.healthTopics.length > 0) {
        // Check if we need a new page
        if (currentY + 40 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('General Wellness Recommendations:', 20, currentY);
        currentY += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const recommendations = [
          '• Schedule an appointment with your healthcare provider to discuss these topics',
          '• Keep a symptom diary noting patterns, triggers, and severity',
          '• Maintain a healthy lifestyle with proper nutrition and exercise',
          '• Monitor your symptoms and seek immediate care if they worsen',
          '• Bring this summary to your medical appointment for reference',
          '• Ask your doctor about any concerns or questions you may have'
        ];
        
        recommendations.forEach(rec => {
          if (currentY + 6 > pageHeight) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(rec, 20, currentY);
          currentY += 5;
        });

        currentY += 10;
      }


      // Enhanced Medical Disclaimer
      if (currentY + 30 > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('IMPORTANT MEDICAL DISCLAIMER', 20, currentY);
      currentY += 8;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      const disclaimerText = [
        '• This AI-generated analysis is for informational and educational purposes ONLY',
        '• This is NOT a medical diagnosis and should never replace professional medical advice',
        '• AI confidence levels are estimates and should not be considered definitive',
        '• Always consult qualified healthcare providers for proper medical evaluation and treatment',
        '• Seek immediate medical attention for urgent or emergency symptoms',
        '• This document is generated by DrKnowsIt.ai artificial intelligence technology'
      ];

      disclaimerText.forEach(line => {
        if (currentY + 4 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(line, 20, currentY);
        currentY += 4;
      });

      // Footer with contact information
      const finalPageY = doc.internal.pageSize.height - 25;
      doc.setPage(doc.internal.pages.length - 1);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Generated by DrKnowsIt.ai | www.drknowsit.ai | AI-Powered Health Guidance Platform', 20, finalPageY);
      doc.text(`Document ID: AIFM-${new Date().getTime()} | Generated: ${new Date().toISOString()}`, 20, finalPageY + 4);

      // Save the PDF with professional filename
      const fileName = `DrKnowsIt-AI-Health-Summary-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Generated Successfully",
        description: "Your AI Free Mode summary has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportPDF = () => {
    generatePDF();
  };

  const handleStartNewChat = () => {
    onStartNewChat();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <DialogTitle>AI Free Mode Complete!</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Anatomy */}
              {sessionData.selectedAnatomy.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Body Areas Discussed:</h4>
                  <div className="flex flex-wrap gap-2">
                    {sessionData.selectedAnatomy.map((area) => (
                      <Badge key={area} variant="outline">
                        {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Answered */}
              <div>
                <h4 className="font-medium text-sm mb-2">Conversation Progress:</h4>
                <p className="text-sm text-muted-foreground">
                  Answered {sessionData.conversationPath.length} questions
                </p>
              </div>

              {/* Health Topics Identified */}
              {sessionData.healthTopics.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Health Topics Identified:</h4>
                  <p className="text-sm text-muted-foreground">
                    {sessionData.healthTopics.length} potential health topic{sessionData.healthTopics.length !== 1 ? 's' : ''} identified
                  </p>
                </div>
              )}

              {/* Final Summary */}
              {sessionData.finalSummary && (
                <div>
                  <h4 className="font-medium text-sm mb-2">AI Analysis:</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-line">
                      {sessionData.finalSummary}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Your Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Want to save your AI Free Mode results? Export to PDF to share with your healthcare provider or keep for your records.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  className="flex-1"
                >
                  {isGeneratingPDF ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export to PDF
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={onClose}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ready to explore more health topics or need a deeper analysis?
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={handleStartNewChat}
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start New AI Free Mode
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Want more detailed AI conversations and advanced health tracking?
                  </p>
                  <Button size="sm" className="w-full">
                    Upgrade for Full AI Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};