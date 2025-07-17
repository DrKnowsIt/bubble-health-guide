import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  User, 
  Volume2, 
  Moon, 
  Trash2,
  AlertTriangle,
  Check,
  Mail,
  Smartphone
} from "lucide-react";

interface SettingsDashboardProps {
  user: {
    name: string;
    email: string;
    subscription: string;
  };
}

export const SettingsDashboard = ({ user }: SettingsDashboardProps) => {
  const [settings, setSettings] = useState({
    notifications: {
      emailReminders: true,
      chatSummaries: true,
      healthInsights: false,
      promotions: false,
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      doctorSharing: true,
    },
    voice: {
      enabled: true,
      autoActivation: false,
      voiceGender: 'female',
    },
    appearance: {
      darkMode: false,
      fontSize: 'medium',
    }
  });

  const updateSetting = (category: string, setting: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your DrNorbit preferences and account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user.name} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} />
            </div>
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-medium">{user.subscription}</span>
                <Button size="sm" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-accent" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Email Reminders</Label>
                <p className="text-xs text-muted-foreground">Get reminded about health check-ins</p>
              </div>
              <Switch
                checked={settings.notifications.emailReminders}
                onCheckedChange={(checked) => updateSetting('notifications', 'emailReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Chat Summaries</Label>
                <p className="text-xs text-muted-foreground">Weekly summaries of your conversations</p>
              </div>
              <Switch
                checked={settings.notifications.chatSummaries}
                onCheckedChange={(checked) => updateSetting('notifications', 'chatSummaries', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Health Insights</Label>
                <p className="text-xs text-muted-foreground">AI-generated health recommendations</p>
              </div>
              <Switch
                checked={settings.notifications.healthInsights}
                onCheckedChange={(checked) => updateSetting('notifications', 'healthInsights', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Promotions</Label>
                <p className="text-xs text-muted-foreground">Updates about new features and offers</p>
              </div>
              <Switch
                checked={settings.notifications.promotions}
                onCheckedChange={(checked) => updateSetting('notifications', 'promotions', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-secondary" />
              <span>Privacy & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Anonymous Analytics</Label>
                <p className="text-xs text-muted-foreground">Help improve DrNorbit with usage data</p>
              </div>
              <Switch
                checked={settings.privacy.analytics}
                onCheckedChange={(checked) => updateSetting('privacy', 'analytics', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Doctor Sharing</Label>
                <p className="text-xs text-muted-foreground">Allow export of summaries to healthcare providers</p>
              </div>
              <Switch
                checked={settings.privacy.doctorSharing}
                onCheckedChange={(checked) => updateSetting('privacy', 'doctorSharing', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Download My Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Privacy Policy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5 text-primary" />
              <span>Voice Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Voice Mode</Label>
                <p className="text-xs text-muted-foreground">Enable voice conversations with DrNorbit</p>
              </div>
              <Switch
                checked={settings.voice.enabled}
                onCheckedChange={(checked) => updateSetting('voice', 'enabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Auto-Activation</Label>
                <p className="text-xs text-muted-foreground">Start listening when opening chat</p>
              </div>
              <Switch
                checked={settings.voice.autoActivation}
                onCheckedChange={(checked) => updateSetting('voice', 'autoActivation', checked)}
                disabled={!settings.voice.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Voice Preference</Label>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={settings.voice.voiceGender === 'female' ? 'default' : 'outline'}
                  onClick={() => updateSetting('voice', 'voiceGender', 'female')}
                  disabled={!settings.voice.enabled}
                  className="flex-1"
                >
                  Female Voice
                </Button>
                <Button
                  size="sm"
                  variant={settings.voice.voiceGender === 'male' ? 'default' : 'outline'}
                  onClick={() => updateSetting('voice', 'voiceGender', 'male')}
                  disabled={!settings.voice.enabled}
                  className="flex-1"
                >
                  Male Voice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-accent" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Use dark theme for the interface</p>
              </div>
              <Switch
                checked={settings.appearance.darkMode}
                onCheckedChange={(checked) => updateSetting('appearance', 'darkMode', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Text Size</Label>
              <div className="flex space-x-2">
                {['small', 'medium', 'large'].map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={settings.appearance.fontSize === size ? 'default' : 'outline'}
                    onClick={() => updateSetting('appearance', 'fontSize', size)}
                    className="flex-1 capitalize"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="medical-card border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
              <div>
                <h4 className="font-medium text-destructive">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
            
            <div className="p-4 bg-warning/10 rounded-lg space-y-3">
              <div>
                <h4 className="font-medium text-warning">Clear All Data</h4>
                <p className="text-sm text-muted-foreground">
                  Remove all conversations and health data while keeping your account.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-warning text-warning hover:bg-warning/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Changes */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline">Cancel</Button>
        <Button className="btn-primary">
          <Check className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};