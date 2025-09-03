import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Target, Lightbulb, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisResult {
  type: 'diagnosis' | 'solution' | 'memory';
  status: 'loading' | 'success' | 'error';
  data?: {
    added?: number;
    updated?: number;
    items?: Array<{ text: string; confidence?: number; category?: string }>;
  };
  error?: string;
}

interface ChatAnalysisNotificationProps {
  results: AnalysisResult[];
  onResultsProcessed?: () => void;
  className?: string;
}

export const ChatAnalysisNotification: React.FC<ChatAnalysisNotificationProps> = ({
  results,
  onResultsProcessed,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);

  // Auto-collapse after 5 seconds if successful
  useEffect(() => {
    if (results.some(r => r.status === 'success') && autoCollapse) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
        onResultsProcessed?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [results, autoCollapse, onResultsProcessed]);

  // Don't render if no results
  if (results.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'diagnosis':
        return <Target className="h-4 w-4" />;
      case 'solution':
        return <Lightbulb className="h-4 w-4" />;
      case 'memory':
        return <Brain className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatResultText = (result: AnalysisResult) => {
    if (result.status === 'loading') {
      return `Analyzing ${result.type}...`;
    }
    
    if (result.status === 'error') {
      return `Failed to analyze ${result.type}`;
    }

    const { added = 0, updated = 0 } = result.data || {};
    const total = added + updated;
    
    if (total === 0) {
      return `No new ${result.type === 'diagnosis' ? 'topics' : result.type} found`;
    }

    const typeText = result.type === 'diagnosis' ? 'Topic' : 
                    result.type === 'solution' ? 'Solution' : 'Memory';
    
    let text = '';
    if (added > 0) text += `${added} ${typeText}${added > 1 ? 's' : ''} Added`;
    if (updated > 0) {
      if (text) text += ', ';
      text += `${updated} Updated`;
    }
    
    return text;
  };

  const hasContent = results.some(r => r.status !== 'loading' && (r.data?.added || 0) + (r.data?.updated || 0) > 0);

  return (
    <div className={cn(
      "mt-2 mb-3 rounded-lg border transition-all duration-200",
      hasContent ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200",
      className
    )}>
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          setAutoCollapse(false);
        }}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {results.some(r => r.status === 'loading') ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <div className={cn(
              "h-2 w-2 rounded-full",
              hasContent ? "bg-green-500" : "bg-blue-500"
            )} />
          )}
          <span className="text-sm font-medium text-gray-700">
            {results.some(r => r.status === 'loading') 
              ? 'Analyzing conversation...' 
              : `Analysis complete${hasContent ? ' - New insights found!' : ''}`
            }
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {results.map((result, index) => (
              <div
                key={index}
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium border",
                  getStatusColor(result.status)
                )}
              >
                <div className="flex items-center gap-1">
                  {result.status === 'loading' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    getIcon(result.type)
                  )}
                  {formatResultText(result)}
                </div>
              </div>
            ))}
          </div>
          
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200/50 bg-white/30 rounded-b-lg">
          <div className="mt-2 space-y-2">
            {results.map((result, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center gap-2 font-medium text-gray-700 mb-1">
                  {getIcon(result.type)}
                  {result.type.charAt(0).toUpperCase() + result.type.slice(1)} Analysis
                </div>
                
                {result.status === 'error' && (
                  <div className="text-red-600 text-xs pl-6">
                    Error: {result.error || 'Analysis failed'}
                  </div>
                )}

                {result.status === 'success' && result.data?.items && result.data.items.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {result.data.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-xs text-gray-600 bg-white/50 rounded px-2 py-1">
                        <div className="flex items-center justify-between">
                          <span className="flex-1 truncate">{item.text}</span>
                          {item.confidence && (
                            <span className={cn(
                              "ml-2 text-xs font-medium",
                              item.confidence >= 0.8 ? "text-green-600" :
                              item.confidence >= 0.6 ? "text-yellow-600" : "text-gray-500"
                            )}>
                              {Math.round(item.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        {item.category && (
                          <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                        )}
                      </div>
                    ))}
                    {result.data.items.length > 3 && (
                      <div className="text-xs text-gray-500 pl-2">
                        +{result.data.items.length - 3} more...
                      </div>
                    )}
                  </div>
                )}
                
                {result.status === 'success' && (!result.data?.items || result.data.items.length === 0) && (
                  <div className="text-xs text-gray-500 pl-6">
                    No new insights found in this exchange.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};