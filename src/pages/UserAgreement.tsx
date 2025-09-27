import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Scale, Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const UserAgreement = () => {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bubble">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">User Agreement</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Critical Legal Notice */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" />
                CRITICAL LEGAL NOTICE - READ CAREFULLY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 p-4 rounded-lg mb-4">
                <p className="text-destructive font-bold mb-2">
                  BY USING DRKNOWSIT, YOU AGREE TO ALL TERMS AND ASSUME ALL RISKS
                </p>
                <p className="text-destructive text-sm">
                  This agreement contains important legal provisions that limit our liability and 
                  require you to take responsibility for your health decisions. If you do not agree 
                  to these terms, do not use this service.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Definition */}
          <Card>
            <CardHeader>
              <CardTitle>1. Service Definition and Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">DrKnowsIt is an educational AI platform that:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Provides general health information through AI conversations</li>
                    <li>Helps organize health concerns for doctor visits</li>
                    <li>Offers educational content about medical topics</li>
                    <li>Assists with health record organization and tracking</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-amber-800 font-semibold text-sm">
                    DrKnowsIt is NOT a medical device, healthcare provider, or medical professional.
                    It does not provide medical advice, diagnosis, or treatment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>2. Your Responsibilities and Obligations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">You agree to:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Use DrKnowsIt for educational and informational purposes only</li>
                    <li>Consult qualified healthcare professionals for all medical decisions</li>
                    <li>Never rely solely on AI responses for health-related choices</li>
                    <li>Provide accurate information to receive relevant responses</li>
                    <li>Maintain the security and confidentiality of your account</li>
                    <li>Not attempt to use the service to harm yourself or others</li>
                    <li>Respect intellectual property rights and terms of use</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">You acknowledge that:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>AI responses may contain errors, omissions, or inaccuracies</li>
                    <li>You assume full responsibility for any actions taken based on AI responses</li>
                    <li>DrKnowsIt cannot replace professional medical judgment</li>
                    <li>Emergency medical situations require immediate professional intervention</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comprehensive Liability Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scale className="mr-2 h-5 w-5" />
                3. Limitation of Liability and Legal Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                  <h4 className="font-bold text-red-800 mb-2">MAXIMUM LIABILITY LIMITATION</h4>
                  <p className="text-red-700 text-sm">
                    TO THE FULLEST EXTENT PERMITTED BY LAW, DRKNOWSIT AND ITS CREATORS, 
                    OPERATORS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY DAMAGES 
                    OF ANY KIND ARISING FROM YOUR USE OF THIS SERVICE.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">This includes but is not limited to:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Medical outcomes or health consequences</li>
                    <li>Decisions made based on AI responses</li>
                    <li>Delays in seeking professional medical care</li>
                    <li>Misdiagnosis or missed diagnosis due to AI limitations</li>
                    <li>Adverse reactions or treatment complications</li>
                    <li>Financial losses related to health decisions</li>
                    <li>Emotional distress or psychological harm</li>
                    <li>Data loss or security breaches</li>
                    <li>Service interruptions or unavailability</li>
                  </ul>
                </div>

                <div className="bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary-light))] p-4 rounded-lg">
                  <h4 className="font-semibold text-[hsl(var(--primary))] mb-2">Monetary Limitation</h4>
                  <p className="text-[hsl(var(--primary))] text-sm">
                    In no event shall our total liability to you exceed the amount you paid 
                    for the service in the 12 months preceding the claim, or $100, whichever is less.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indemnification */}
          <Card>
            <CardHeader>
              <CardTitle>4. Indemnification and Hold Harmless</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <p className="text-yellow-800 font-semibold mb-2">User Protection Clause:</p>
                <p className="text-yellow-700 text-sm">
                  You agree to indemnify, defend, and hold harmless DrKnowsIt from any and all 
                  claims, damages, losses, costs, and expenses (including attorney fees) arising 
                  from your use of the service or violation of these terms.
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                This means you take responsibility for your use of the service and will protect 
                us from legal consequences of your actions or decisions.
              </p>
            </CardContent>
          </Card>

          {/* Data Collection and Research */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                5. Data Collection for Medical Research
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Research Purpose</h4>
                  <p className="text-purple-700 text-sm">
                    We collect and analyze anonymized health conversation data to discover medical 
                    patterns and correlations that traditional research methods and individual 
                    healthcare providers might not identify.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What we collect for research:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Anonymized conversation content and health topics discussed</li>
                    <li>Generalized demographic information (age ranges, broad geographic regions)</li>
                    <li>Health patterns and symptom correlations (without personal identifiers)</li>
                    <li>Treatment outcomes and effectiveness data (anonymized)</li>
                    <li>Usage patterns and feature interactions</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Privacy protections:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>All names, addresses, and contact information are completely removed</li>
                    <li>Data is aggregated to prevent individual identification</li>
                    <li>Multiple layers of anonymization protect your privacy</li>
                    <li>Research data cannot be traced back to individual users</li>
                    <li>We comply with all applicable privacy and research regulations</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Potential benefits of this research:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Earlier detection of disease patterns and health trends</li>
                    <li>Discovery of previously unknown correlations between conditions</li>
                    <li>Improved AI accuracy and personalized health guidance</li>
                    <li>Advancement of population health and preventive medicine</li>
                    <li>Contribution to medical breakthroughs and treatment development</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prohibited Uses */}
          <Card>
            <CardHeader>
              <CardTitle>6. Prohibited Uses and Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">You may NOT use DrKnowsIt to:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Seek medical diagnosis, treatment recommendations, or prescriptions</li>
                    <li>Handle medical emergencies (use emergency services instead)</li>
                    <li>Replace professional medical consultations or second opinions</li>
                    <li>Make critical health decisions without professional guidance</li>
                    <li>Provide medical advice to others based on AI responses</li>
                    <li>Attempt to reverse-engineer or manipulate the AI system</li>
                    <li>Share false, misleading, or harmful health information</li>
                    <li>Use the service for any illegal or unauthorized purpose</li>
                    <li>Attempt to access other users' data or accounts</li>
                    <li>Upload malicious code or attempt to harm the system</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>7. Dispute Resolution and Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Arbitration Agreement:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Any disputes will be resolved through binding arbitration, not court proceedings</li>
                    <li>Arbitration will be conducted under American Arbitration Association rules</li>
                    <li>You waive your right to participate in class action lawsuits</li>
                    <li>Arbitration decisions are final and binding on both parties</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Governing Law:</h4>
                  <p className="text-muted-foreground text-sm">
                    These terms are governed by the laws of [Your State/Country]. Any legal 
                    proceedings must be brought in the jurisdiction specified in our terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Modifications */}
          <Card>
            <CardHeader>
              <CardTitle>8. Service Modifications and Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We reserve the right to modify, suspend, or discontinue any aspect of the 
                  service at any time without prior notice. This includes features, pricing, 
                  terms of service, and availability.
                </p>
                <p>
                  We may terminate your access for violations of these terms, non-payment, 
                  or any other reason at our discretion. You may terminate your account at any time.
                </p>
                <p>
                  Upon termination, your access will cease, but certain provisions of this 
                  agreement (including liability limitations and indemnification) will survive.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Agreement */}
          <Card>
            <CardHeader>
              <CardTitle>9. Changes to This Agreement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify this User Agreement at any time. Material changes 
                will be communicated via email or through the service interface. Continued use 
                after changes constitutes acceptance of the modified terms.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  It is your responsibility to review these terms periodically for changes. 
                  If you do not agree to modified terms, you must stop using the service.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>10. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this User Agreement, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Legal Department:</strong> legal@drknowit.com</p>
                <p><strong>Phone:</strong> 919-616-6125</p>
                <p><strong>Mail:</strong> DrKnowsIt Legal Department<br />123 Health Street<br />Medical City, MC 12345</p>
              </div>
            </CardContent>
          </Card>

          {/* Final Acknowledgment */}
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                  <p className="font-bold text-primary text-lg mb-2">
                    FINAL ACKNOWLEDGMENT
                  </p>
                  <p className="text-primary text-sm">
                    By using DrKnowsIt, you acknowledge that you have read, understood, 
                    and agree to be bound by this entire User Agreement. You understand
                    the risks and limitations, and you accept full responsibility for your 
                    health decisions.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This agreement constitutes the entire understanding between you and DrKnowsIt 
                  regarding your use of the service and supersedes all prior agreements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserAgreement;