import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Eye, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useHealthInsights } from '@/hooks/useHealthInsights';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportantHealthInfoProps {
  patientId?: string | null;
}

export const ImportantHealthInfo = ({ patientId }: ImportantHealthInfoProps) => {
  const { insights, loading, acknowledgeInsight, deleteInsight, getInsightsByPriority, getUnacknowledgedCount } = useHealthInsights(patientId);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    urgent: true,
    moderate: false,
    watch: false
  });

  const { urgent, moderate, watch } = getInsightsByPriority();
  const unacknowledgedCount = getUnacknowledgedCount();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'moderate':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'watch':
        return <Eye className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'destructive';
      case 'moderate':
        return 'secondary';
      case 'watch':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleAcknowledge = async (insightId: string) => {
    await acknowledgeInsight(insightId);
  };

  const handleDelete = async (insightId: string) => {
    await deleteInsight(insightId);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderInsightSection = (title: string, insights: any[], severity: string, icon: React.ReactNode) => {
    if (insights.length === 0) return null;

    return (
      <Collapsible 
        open={expandedSections[severity]} 
        onOpenChange={() => toggleSection(severity)}
        className="space-y-2"
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-3 h-auto"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium">{title}</span>
              <Badge variant={getSeverityColor(severity) as any} className="ml-2">
                {insights.length}
              </Badge>
            </div>
            {expandedSections[severity] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          {insights.map((insight) => (
            <Card key={insight.id} className="border-l-4 border-l-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(insight.severity_level)}
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge variant={getSeverityColor(insight.severity_level) as any} className="text-xs">
                        {insight.insight_type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    
                    {insight.recommendation && (
                      <Alert className="mt-2">
                        <AlertDescription className="text-xs">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {insight.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: {Math.round(insight.confidence_score * 100)}%
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(insight.id)}
                      className="h-7 px-2"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(insight.id)}
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unacknowledgedCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              No concerning health findings at this time. Keep up the good work!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Important Information
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unacknowledgedCount}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-identified health findings that may need your attention
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderInsightSection(
          "Urgent",
          urgent,
          "urgent",
          <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
        
        {renderInsightSection(
          "Moderate",
          moderate,
          "moderate",
          <AlertTriangle className="w-4 h-4 text-warning" />
        )}
        
        {renderInsightSection(
          "Watch",
          watch,
          "watch",
          <Eye className="w-4 h-4 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
};