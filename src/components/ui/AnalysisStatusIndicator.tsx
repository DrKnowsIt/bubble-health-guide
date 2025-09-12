import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Clock, CheckCircle } from 'lucide-react';

interface AnalysisStatusIndicatorProps {
  isAnalyzing: boolean;
  currentStage?: string;
  messagesUntilAnalysis: number;
  messagesUntilDeepAnalysis: number;
  queueStatus?: {
    activeCount: number;
    queuedCount: number;
    maxConcurrent: number;
  };
}

export const AnalysisStatusIndicator: React.FC<AnalysisStatusIndicatorProps> = ({
  isAnalyzing,
  currentStage,
  messagesUntilAnalysis,
  messagesUntilDeepAnalysis,
  queueStatus
}) => {
  if (isAnalyzing) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
        <span>{currentStage || "Analyzing conversation..."}</span>
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
          Active
        </Badge>
      </div>
    );
  }

  if (queueStatus && queueStatus.queuedCount > 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Analysis queued ({queueStatus.queuedCount} pending)</span>
        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
          Queued
        </Badge>
      </div>
    );
  }

  if (messagesUntilAnalysis === 0 || messagesUntilDeepAnalysis === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-3 w-3 text-green-600" />
        <span>
          {messagesUntilDeepAnalysis === 0 ? '🔬 Deep analysis ready' : '⚡ Analysis ready'}
        </span>
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
          Ready
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <CheckCircle className="h-3 w-3" />
      <span>
        🔍 Next analysis in {messagesUntilAnalysis} message{messagesUntilAnalysis !== 1 ? 's' : ''}
        {messagesUntilDeepAnalysis <= 4 && messagesUntilDeepAnalysis > 0 && (
          <span className="ml-2 text-blue-600">🔬 Deep in {messagesUntilDeepAnalysis}</span>
        )}
      </span>
      <Badge variant="outline" className="text-xs">
        Standby
      </Badge>
    </div>
  );
};