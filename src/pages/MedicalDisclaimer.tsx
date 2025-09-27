import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const MedicalDisclaimer = () => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning">
              <AlertTriangle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Medical Disclaimer</h1>
              <p className="text-muted-foreground">Important information about using DrKnowItAll</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <Card className="medical-card border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>CRITICAL: NOT A MEDICAL SERVICE</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 p-6 rounded-lg space-y-4">
                <p className="text-destructive font-bold text-lg">
                  DrKnowItAll is NOT a substitute for professional medical care, diagnosis, or treatment.
                </p>
                <ul className="list-disc list-inside text-destructive space-y-2">
                  <li>DrKnowItAll cannot diagnose medical conditions or diseases</li>
                  <li>DrKnowItAll cannot prescribe medications or treatments</li>
                  <li>DrKnowItAll cannot provide emergency medical care</li>
                  <li>DrKnowItAll generates health topics for discussion, not medical diagnoses</li>
                  <li>DrKnowItAll responses are for educational purposes only</li>
                  <li>All health topics require professional medical evaluation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card border-warning/20">
            <CardHeader>
              <CardTitle className="text-warning">Emergency Situations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-warning/10 p-6 rounded-lg space-y-4">
                <p className="text-warning font-bold">
                  🚨 If you are experiencing a medical emergency, do NOT use DrKnowItAll.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Call Emergency Services:</h3>
                    <div className="flex items-center space-x-2 text-destructive font-bold">
                      <Phone className="h-4 w-4" />
                      <span>911 (US) or your local emergency number</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Emergency Signs Include:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Chest pain or difficulty breathing</li>
                      <li>• Severe injuries or bleeding</li>
                      <li>• Loss of consciousness</li>
                      <li>• Suicidal thoughts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>What DrKnowItAll IS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent-light p-4 rounded-lg mb-4">
                <p className="text-accent-foreground font-medium">
                  DrKnowItAll is an educational health companion designed to help you understand 
                  health topics and prepare for doctor visits.
                </p>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Educational tool:</strong> Provides general health information and explanations</li>
                <li><strong>Preparation assistant:</strong> Helps organize your health concerns before medical visits</li>
                <li><strong>Information organizer:</strong> Keeps track of your health history and conversations</li>
                <li><strong>Health companion:</strong> Offers support and guidance for understanding health topics</li>
                <li><strong>Communication bridge:</strong> Generates summaries to share with your healthcare team</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>What DrKnowItAll is NOT</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Medical practitioner:</strong> Cannot diagnose conditions or diseases</li>
                <li><strong>Prescription service:</strong> Cannot recommend or prescribe medications</li>
                <li><strong>Emergency service:</strong> Cannot provide urgent or emergency medical care</li>
                <li><strong>Licensed healthcare provider:</strong> Cannot replace visits to doctors or specialists</li>
                <li><strong>Medical diagnosis tool:</strong> Generates discussion topics, not medical diagnoses</li>
                <li><strong>Medical advice source:</strong> Cannot provide personalized medical recommendations</li>
                <li><strong>Therapy service:</strong> Cannot provide mental health counseling or therapy</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>AI Limitations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Our AI technology, while advanced, has important limitations you should understand:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>No physical examination:</strong> Cannot see, touch, or physically examine you</li>
                <li><strong>Limited context:</strong> Only knows information you provide in conversations</li>
                <li><strong>General information:</strong> Responses are based on general medical knowledge</li>
                <li><strong>No real-time updates:</strong> May not have the latest medical research or guidelines</li>
                <li><strong>Pattern recognition:</strong> Works on patterns, not individual medical assessment</li>
                <li><strong>No liability:</strong> AI responses are suggestions, not medical recommendations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Professional Medical Care</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Always consult qualified healthcare professionals for:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Medical Decisions</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>Diagnosis of symptoms</li>
                      <li>Treatment recommendations</li>
                      <li>Medication prescriptions</li>
                      <li>Surgery or procedures</li>
                      <li>Medical test interpretation</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Health Concerns</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>Persistent or worsening symptoms</li>
                      <li>New or unusual health changes</li>
                      <li>Medication side effects</li>
                      <li>Pregnancy and reproductive health</li>
                      <li>Mental health concerns</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Your Responsibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">By using DrKnowItAll, you acknowledge that:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>You understand DrKnowItAll is for educational purposes only</li>
                <li>You will not rely solely on DrKnowItAll for medical decisions</li>
                <li>You will consult healthcare professionals for medical advice</li>
                <li>You will seek immediate medical care for emergencies</li>
                <li>You understand AI responses are not medical diagnoses</li>
                <li>You will use DrKnowItAll as a supplementary tool, not a replacement for medical care</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Recommended Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-primary-light p-6 rounded-lg">
                <h3 className="font-semibold text-foreground mb-3">Best Practice for Using DrKnowItAll:</h3>
                <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                  <li>Use DrKnowItAll to learn about health topics and organize your concerns</li>
                  <li>Prepare questions and summaries for your healthcare provider</li>
                  <li>Share DrKnowItAll-generated summaries with your doctor for their review</li>
                  <li>Follow your healthcare provider's advice over any AI suggestions</li>
                  <li>Maintain regular checkups and professional medical relationships</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Questions or Concerns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have questions about this disclaimer or DrKnowItAll's capabilities:
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@drknowit.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Phone Support</p>
                    <p className="text-sm text-muted-foreground">919-616-6125</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;