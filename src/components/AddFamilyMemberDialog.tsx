import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Dog, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AddFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MemberType = 'human' | 'pet' | null;
type DialogStep = 'type-selection' | 'form';

export const AddFamilyMemberDialog = ({ open, onOpenChange }: AddFamilyMemberDialogProps) => {
  const { createUser, users, canAddUser, getUserLimit, refreshUsers } = useUsers();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<DialogStep>('type-selection');
  const [memberType, setMemberType] = useState<MemberType>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    relationship: '',
    species: '',
    breed: ''
  });

  const handleTypeSelection = (type: MemberType) => {
    setMemberType(type);
    setCurrentStep('form');
    // Reset form data when switching types
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      relationship: '',
      species: '',
      breed: ''
    });
  };

  const handleBack = () => {
    setCurrentStep('type-selection');
    setMemberType(null);
  };

  const handleClose = () => {
    setCurrentStep('type-selection');
    setMemberType(null);
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      relationship: '',
      species: '',
      breed: ''
    });
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberType) return;

    // Validation based on member type
    if (memberType === 'human') {
      if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.relationship) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    } else if (memberType === 'pet') {
      if (!formData.first_name.trim() || !formData.species.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in pet name and species.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!canAddUser()) {
      const limit = getUserLimit();
      toast({
        title: "User limit reached",
        description: `Your plan allows up to ${limit} family members. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: memberType === 'pet' ? '' : formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        relationship: memberType === 'pet' ? 'pet' : formData.relationship,
        is_primary: false,
        is_pet: memberType === 'pet',
        species: memberType === 'pet' ? formData.species : undefined,
        breed: memberType === 'pet' ? formData.breed : undefined,
      };

      await createUser(userData);
      await refreshUsers();

      toast({
        title: `${memberType === 'pet' ? 'Pet' : 'Family member'} added`,
        description: `${formData.first_name} has been added successfully.`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error adding family member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const humanRelationshipOptions = [
    { value: 'spouse', label: 'Spouse/Partner' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'grandchild', label: 'Grandchild' },
    { value: 'other', label: 'Other Family Member' }
  ];

  const humanGenderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' }
  ];

  const petGenderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unknown', label: 'Unknown' }
  ];

  const userLimit = getUserLimit();
  const currentCount = users.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {currentStep === 'type-selection' ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Choose whether you want to add a human family member or a pet to track their health information.
                {userLimit > 0 && (
                  <span className="block text-sm text-muted-foreground mt-1">
                    {currentCount} of {userLimit} family members used.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/50"
                onClick={() => handleTypeSelection('human')}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Add Human</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <CardDescription>
                    Add a family member, friend, or other human to track their health
                  </CardDescription>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/50"
                onClick={() => handleTypeSelection('pet')}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <Dog className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Add Pet</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <CardDescription>
                    Add a beloved pet to track their health and wellbeing
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="p-0 h-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  {memberType === 'pet' ? <Dog className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  <DialogTitle>
                    Add {memberType === 'pet' ? 'Pet' : 'Human Family Member'}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription>
                Fill in the details for your {memberType === 'pet' ? 'pet' : 'family member'}.
                {userLimit > 0 && (
                  <span className="block text-sm text-muted-foreground mt-1">
                    {currentCount} of {userLimit} family members used.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {memberType === 'human' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        placeholder="Enter first name"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        placeholder="Enter last name"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Select 
                      value={formData.relationship} 
                      onValueChange={(value) => handleInputChange('relationship', value)}
                      disabled={isSubmitting}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {humanRelationshipOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {humanGenderOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pet_name">Pet Name *</Label>
                    <Input
                      id="pet_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter pet's name"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="species">Species *</Label>
                      <Input
                        id="species"
                        value={formData.species}
                        onChange={(e) => handleInputChange('species', e.target.value)}
                        placeholder="e.g., Dog, Cat, Bird"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed">Breed</Label>
                      <Input
                        id="breed"
                        value={formData.breed}
                        onChange={(e) => handleInputChange('breed', e.target.value)}
                        placeholder="e.g., Golden Retriever"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pet_gender">Gender</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {petGenderOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <DialogFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !canAddUser()}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add {memberType === 'pet' ? 'Pet' : 'Family Member'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};