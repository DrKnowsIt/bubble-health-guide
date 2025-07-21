import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthRecords } from "@/components/HealthRecords";
import { HealthForms } from "@/components/HealthForms";
import { 
  Heart, 
  Edit, 
  Save, 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  Download,
  Plus,
  X,
  ClipboardList,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HealthProfileProps {
  user: {
    name: string;
    email: string;
  };
}

export const HealthProfile = ({ user }: HealthProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [profileData, setProfileData] = useState({
    height: "5'10\"",
    weight: "175 lbs",
    bloodType: "A+",
    allergies: ["Penicillin", "Shellfish"],
    medications: ["Lisinopril 10mg"],
    conditions: ["Hypertension"],
    emergencyContact: "Jane Doe - (555) 123-4567",
    insurance: "Blue Cross Blue Shield",
    primaryDoctor: "Dr. Smith - Family Medicine"
  });

  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newCondition, setNewCondition] = useState("");

  const addToList = (type: 'allergies' | 'medications' | 'conditions', value: string) => {
    if (value.trim()) {
      setProfileData(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
      if (type === 'allergies') setNewAllergy("");
      if (type === 'medications') setNewMedication("");
      if (type === 'conditions') setNewCondition("");
    }
  };

  const removeFromList = (type: 'allergies' | 'medications' | 'conditions', index: number) => {
    setProfileData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const exportHealthSummary = () => {
    const summary = `
HEALTH SUMMARY FOR ${user.name.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

BASIC INFORMATION:
- Date of Birth: ${dateOfBirth ? format(dateOfBirth, "PPP") : "Not specified"}
- Height: ${profileData.height}
- Weight: ${profileData.weight}
- Blood Type: ${profileData.bloodType}

ALLERGIES:
${profileData.allergies.map(allergy => `- ${allergy}`).join('\n')}

CURRENT MEDICATIONS:
${profileData.medications.map(med => `- ${med}`).join('\n')}

MEDICAL CONDITIONS:
${profileData.conditions.map(condition => `- ${condition}`).join('\n')}

EMERGENCY CONTACT:
${profileData.emergencyContact}

INSURANCE:
${profileData.insurance}

PRIMARY DOCTOR:
${profileData.primaryDoctor}

IMPORTANT: This summary is for informational purposes only. Please share with your healthcare provider for review.
    `;
    
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-summary-${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Health Profile</h1>
          <p className="text-muted-foreground">Manage your personal health information and records</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportHealthSummary}>
            <Download className="h-4 w-4 mr-2" />
            Export Summary
          </Button>
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Health Records
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Health Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={user.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!isEditing}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Height</Label>
                <Input 
                  value={profileData.height}
                  onChange={(e) => setProfileData(prev => ({...prev, height: e.target.value}))}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input 
                  value={profileData.weight}
                  onChange={(e) => setProfileData(prev => ({...prev, weight: e.target.value}))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Blood Type</Label>
              <Input 
                value={profileData.bloodType}
                onChange={(e) => setProfileData(prev => ({...prev, bloodType: e.target.value}))}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-accent" />
              <span>Medical Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allergies */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Allergies</Label>
              <div className="space-y-2">
                {profileData.allergies.map((allergy, index) => (
                  <div key={index} className="flex items-center justify-between bg-destructive/10 px-3 py-2 rounded-lg">
                    <span className="text-sm">{allergy}</span>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromList('allergies', index)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add allergy"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList('allergies', newAllergy)}
                    />
                    <Button onClick={() => addToList('allergies', newAllergy)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Medications */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Current Medications</Label>
              <div className="space-y-2">
                {profileData.medications.map((medication, index) => (
                  <div key={index} className="flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg">
                    <span className="text-sm">{medication}</span>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromList('medications', index)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add medication"
                      value={newMedication}
                      onChange={(e) => setNewMedication(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList('medications', newMedication)}
                    />
                    <Button onClick={() => addToList('medications', newMedication)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Medical Conditions</Label>
              <div className="space-y-2">
                {profileData.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center justify-between bg-warning/10 px-3 py-2 rounded-lg">
                    <span className="text-sm">{condition}</span>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromList('conditions', index)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add condition"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList('conditions', newCondition)}
                    />
                    <Button onClick={() => addToList('conditions', newCondition)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-secondary" />
              <span>Contact Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input 
                value={profileData.emergencyContact}
                onChange={(e) => setProfileData(prev => ({...prev, emergencyContact: e.target.value}))}
                disabled={!isEditing}
                placeholder="Name - Phone Number"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Doctor</Label>
              <Input 
                value={profileData.primaryDoctor}
                onChange={(e) => setProfileData(prev => ({...prev, primaryDoctor: e.target.value}))}
                disabled={!isEditing}
                placeholder="Dr. Name - Specialty"
              />
            </div>
            <div className="space-y-2">
              <Label>Insurance Provider</Label>
              <Input 
                value={profileData.insurance}
                onChange={(e) => setProfileData(prev => ({...prev, insurance: e.target.value}))}
                disabled={!isEditing}
                placeholder="Insurance Company"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-accent" />
              <span>AI-Generated Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-accent-light rounded-lg">
                <p className="text-sm text-accent-foreground">
                  📋 <strong>Last Chat Summary:</strong> Discussed headache symptoms and stress management techniques.
                </p>
              </div>
              <div className="p-3 bg-primary-light rounded-lg">
                <p className="text-sm text-primary-foreground">
                  💊 <strong>Medication Reminder:</strong> Consider discussing Lisinopril timing with your doctor.
                </p>
              </div>
              <div className="p-3 bg-secondary-light rounded-lg">
                <p className="text-sm text-secondary-foreground">
                  📝 <strong>Prep for Next Visit:</strong> Bring up blood pressure readings from last month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <HealthRecords />
        </TabsContent>

        <TabsContent value="forms" className="mt-6">
          <HealthForms />
        </TabsContent>
      </Tabs>
    </div>
  );
};