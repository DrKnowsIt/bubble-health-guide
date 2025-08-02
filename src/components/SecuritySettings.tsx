import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Clock, Lock, AlertTriangle } from 'lucide-react';

export const SecuritySettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    otpExpiry: true,
    passwordProtection: false,
    sessionTimeout: true,
    dataEncryption: true
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Security Setting Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} has been ${value ? 'enabled' : 'disabled'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
          <CardDescription>
            Enhanced security settings to protect your health data and account access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="otp-expiry" className="text-base">
                OTP Expiry Protection
              </Label>
              <div className="text-sm text-muted-foreground">
                Automatically expire one-time passwords for enhanced security.
              </div>
            </div>
            <Switch
              id="otp-expiry"
              checked={settings.otpExpiry}
              onCheckedChange={(checked) => handleSettingChange('otpExpiry', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="password-protection" className="text-base">
                Enhanced Password Protection
              </Label>
              <div className="text-sm text-muted-foreground">
                Require stronger passwords and regular password updates.
              </div>
            </div>
            <Switch
              id="password-protection"
              checked={settings.passwordProtection}
              onCheckedChange={(checked) => handleSettingChange('passwordProtection', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="session-timeout" className="text-base">
                Session Timeout
              </Label>
              <div className="text-sm text-muted-foreground">
                Automatically log out after periods of inactivity.
              </div>
            </div>
            <Switch
              id="session-timeout"
              checked={settings.sessionTimeout}
              onCheckedChange={(checked) => handleSettingChange('sessionTimeout', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-encryption" className="text-base">
                Advanced Data Encryption
              </Label>
              <div className="text-sm text-muted-foreground">
                Use additional encryption layers for sensitive health data.
              </div>
            </div>
            <Switch
              id="data-encryption"
              checked={settings.dataEncryption}
              onCheckedChange={(checked) => handleSettingChange('dataEncryption', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.otpExpiry ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">OTP Expiry: {settings.otpExpiry ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.passwordProtection ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-sm">Password Protection: {settings.passwordProtection ? 'Enhanced' : 'Standard'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.sessionTimeout ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Session Security: {settings.sessionTimeout ? 'Protected' : 'Basic'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.dataEncryption ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-sm">Data Encryption: {settings.dataEncryption ? 'Advanced' : 'Standard'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};