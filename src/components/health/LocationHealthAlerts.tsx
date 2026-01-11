import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  MapPin, 
  Plane, 
  X, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Globe,
  Shield,
  Plus
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocationHealthAlerts, HealthAlert } from '@/hooks/useLocationHealthAlerts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface LocationHealthAlertsProps {
  patientId?: string | null;
}

export const LocationHealthAlerts = ({ patientId }: LocationHealthAlertsProps) => {
  const {
    alerts,
    loading,
    patientLocation,
    travelLocations,
    updateLocation,
    addTravelLocation,
    removeTravelLocation,
    dismissAlert,
    refetchAlerts,
    getAlertsBySeverity,
    isUpdatingLocation,
    cached
  } = useLocationHealthAlerts(patientId);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    critical: true,
    high: true,
    medium: false,
    low: false
  });
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [travelDialogOpen, setTravelDialogOpen] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newTravelLocation, setNewTravelLocation] = useState('');

  const { critical, high, medium, low } = getAlertsBySeverity();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Shield className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUpdateLocation = () => {
    if (newCountry) {
      updateLocation({ country: newCountry, region: newRegion || undefined });
      setLocationDialogOpen(false);
      setNewCountry('');
      setNewRegion('');
    }
  };

  const handleAddTravelLocation = () => {
    if (newTravelLocation) {
      addTravelLocation(newTravelLocation);
      setTravelDialogOpen(false);
      setNewTravelLocation('');
    }
  };

  const renderAlertSection = (
    title: string, 
    alertsList: HealthAlert[], 
    severity: string
  ) => {
    if (alertsList.length === 0) return null;

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
              {getSeverityIcon(severity)}
              <span className="font-medium">{title}</span>
              <Badge variant={getSeverityColor(severity) as any} className="ml-2">
                {alertsList.length}
              </Badge>
            </div>
            {expandedSections[severity] ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          {alertsList.map((alert) => (
            <Alert 
              key={alert.id} 
              variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'default'}
              className="relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    {alert.title}
                    <Badge variant="outline" className="text-xs">
                      {alert.disease_type}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm mb-2">{alert.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{alert.region}, {alert.country}</span>
                    </div>
                    
                    {alert.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">Recommendations:</p>
                        <ul className="text-xs list-disc list-inside space-y-0.5">
                          {alert.recommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Source: {alert.source}
                    </p>
                  </AlertDescription>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
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
            <Globe className="w-5 h-5" />
            Location Health Alerts
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Location Health Alerts
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchAlerts()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Location info */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {patientLocation?.location_country 
                ? `${patientLocation.location_region ? `${patientLocation.location_region}, ` : ''}${patientLocation.location_country}`
                : 'Location not set'}
            </span>
          </div>
          
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {patientLocation?.location_country ? 'Update' : 'Set Location'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Your Location</DialogTitle>
                <DialogDescription>
                  Enter your current location to receive relevant health alerts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., United States, United Kingdom"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Region/State (optional)</Label>
                  <Input
                    id="region"
                    placeholder="e.g., California, London"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleUpdateLocation}
                  disabled={!newCountry || isUpdatingLocation}
                >
                  Save Location
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Travel locations */}
        {travelLocations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recent travel:</span>
            {travelLocations.map((location) => (
              <Badge key={location} variant="outline" className="gap-1">
                {location}
                <button
                  onClick={() => removeTravelLocation(location)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <Dialog open={travelDialogOpen} onOpenChange={setTravelDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2">
              <Plus className="w-4 h-4 mr-1" />
              Add Travel Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Travel Location</DialogTitle>
              <DialogDescription>
                Add a recent or upcoming travel destination to receive health alerts for that area.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="travel">Country/Region</Label>
                <Input
                  id="travel"
                  placeholder="e.g., Thailand, Brazil, South Africa"
                  value={newTravelLocation}
                  onChange={(e) => setNewTravelLocation(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleAddTravelLocation}
                disabled={!newTravelLocation}
              >
                Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {cached && (
          <p className="text-xs text-muted-foreground mt-1">
            Cached alerts • Refreshed periodically
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              No health alerts for your location at this time.
            </p>
            {!patientLocation?.location_country && (
              <p className="text-xs text-muted-foreground mt-2">
                Set your location above to receive relevant health alerts.
              </p>
            )}
          </div>
        ) : (
          <>
            {renderAlertSection('Critical', critical, 'critical')}
            {renderAlertSection('High Priority', high, 'high')}
            {renderAlertSection('Medium', medium, 'medium')}
            {renderAlertSection('Low', low, 'low')}
          </>
        )}
      </CardContent>
    </Card>
  );
};
