import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileDown, X, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface EasyChatCompletionModalProps {
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

export const EasyChatCompletionModal = ({ 
  isOpen, 
  onClose, 
  onStartNewChat, 
  sessionData 
}: EasyChatCompletionModalProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = 190;
      const pageHeight = 270;
      let currentY = 40;

      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Easy Chat Health Summary', 20, 20);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} | DrKnowsIt AI`, 20, 28);
      doc.line(20, 32, pageWidth, 32);

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

      // Health Topics
      if (sessionData.healthTopics.length > 0) {
        // Check if we need a new page
        if (currentY + 50 > pageHeight) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Identified Health Topics:', 20, currentY);
        currentY += 10;

        sessionData.healthTopics.forEach((topic, index) => {
          if (currentY + 20 > pageHeight) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}. ${topic.topic}`, 20, currentY);
          currentY += 6;

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.text(`Confidence: ${Math.round(topic.confidence * 100)}%`, 25, currentY);
          currentY += 4;

          if (topic.reasoning) {
            const splitReasoning = doc.splitTextToSize(`Reasoning: ${topic.reasoning}`, pageWidth - 25);
            doc.text(splitReasoning, 25, currentY);
            currentY += splitReasoning.length * 3 + 6;
          }
        });
      }


      // Footer disclaimer
      const disclaimerY = doc.internal.pageSize.height - 20;
      doc.setPage(doc.internal.pages.length - 1);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      doc.text('This AI-generated summary is for informational purposes only and should not replace professional medical advice.', 20, disclaimerY);
      doc.text('Please consult with your healthcare provider for proper medical evaluation and treatment.', 20, disclaimerY + 4);

      // Save the PDF
      doc.save(`easy-chat-summary-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Generated Successfully",
        description: "Your Easy Chat summary has been downloaded.",
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
              <DialogTitle>Easy Chat Complete!</DialogTitle>
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
                Want to save your Easy Chat results? Export to PDF to share with your healthcare provider or keep for your records.
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
                  Start New Easy Chat
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