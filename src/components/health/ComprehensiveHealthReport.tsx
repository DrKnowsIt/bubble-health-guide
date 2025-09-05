import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { useComprehensiveHealthReport } from '@/hooks/useComprehensiveHealthReport';
import { toast } from 'sonner';

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface ComprehensiveHealthReportProps {
  selectedUser?: User | null;
}

export const ComprehensiveHealthReport: React.FC<ComprehensiveHealthReportProps> = ({
  selectedUser
}) => {
  const {
    report,
    loading,
    generating,
    generateReport,
    getStatusColor,
    getPriorityColor,
    isReportOutdated
  } = useComprehensiveHealthReport(selectedUser);

  const handleGenerateReport = async () => {
    try {
      await generateReport();
      toast.success('Comprehensive health report generated successfully');
    } catch (error) {
      toast.error('Failed to generate health report');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading health report...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comprehensive Health Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No comprehensive health report available yet.
            </p>
            <Button 
              onClick={handleGenerateReport} 
              disabled={generating}
              className="gap-2"
            >
              {generating && <RefreshCw className="h-4 w-4 animate-spin" />}
              Generate Health Report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const patientName = selectedUser 
    ? `${selectedUser.first_name} ${selectedUser.last_name}`
    : 'Your';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {patientName} Health Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {isReportOutdated() && (
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Outdated
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generating}
              className="gap-2"
            >
              {generating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {generating ? 'Generating...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Overall Health Status</h3>
            <Badge className={getStatusColor(report.overall_health_status)}>
              {report.overall_health_status?.charAt(0).toUpperCase() + report.overall_health_status?.slice(1)}
            </Badge>
          </div>
          <div>
            <h3 className="font-medium">Priority Level</h3>
            <Badge className={getPriorityColor(report.priority_level)}>
              {report.priority_level?.charAt(0).toUpperCase() + report.priority_level?.slice(1)}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Report Summary */}
        <div>
          <h3 className="font-medium mb-2">Health Summary</h3>
          <p className="text-muted-foreground leading-relaxed">
            {report.report_summary}
          </p>
        </div>

        {/* Key Concerns */}
        {report.key_concerns && report.key_concerns.length > 0 && (
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Key Health Concerns
            </h3>
            <ul className="space-y-1">
              {report.key_concerns.map((concern, index) => (
                <li key={index} className="text-muted-foreground flex items-start gap-2">
                  <span className="text-orange-500 mt-1.5 text-xs">•</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Message to Primary Care Provider */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-800">
            <CheckCircle className="h-4 w-4" />
            Message to Primary Care Provider
          </h3>
          <div className="space-y-3 text-sm text-blue-900">
            <div>
              <span className="font-medium">Current Patient Concerns: </span>
              {report.key_concerns && report.key_concerns.length > 0 
                ? report.key_concerns.join(', ')
                : 'Patient reports feeling well overall'
              }
            </div>
            <div>
              <span className="font-medium">Suggested Assessments: </span>
              Based on reported symptoms, consider: routine vitals, basic metabolic panel, and targeted examination of areas of concern.
            </div>
            <div>
              <span className="font-medium">Patient Timeline: </span>
              Symptoms and concerns have been developing over recent conversations. Please review full health history for context.
            </div>
            <div className="text-xs text-blue-700 mt-2">
              This summary is generated from patient conversations and health data. Please conduct your own clinical assessment.
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Wellness Recommendations
            </h3>
            <ul className="space-y-1">
              {report.recommendations.map((recommendation, index) => (
                <li key={index} className="text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1.5 text-xs">•</span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Health Metrics Summary */}
        {report.health_metrics_summary && (
          <div className="grid md:grid-cols-2 gap-4">
            {report.health_metrics_summary.strengths && report.health_metrics_summary.strengths.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-green-600 mb-2">Health Strengths</h4>
                <ul className="space-y-1">
                  {report.health_metrics_summary.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.health_metrics_summary.areas_for_improvement && report.health_metrics_summary.areas_for_improvement.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-orange-600 mb-2">Areas for Improvement</h4>
                <ul className="space-y-1">
                  {report.health_metrics_summary.areas_for_improvement.map((area, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Confidence and Last Updated */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Last updated: {new Date(report.updated_at).toLocaleDateString()}
          </div>
          {report.confidence_score && (
            <div>
              Confidence: {Math.round(report.confidence_score * 100)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};