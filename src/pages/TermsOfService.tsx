import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using DrKnowItAll ("Service"), you accept and agree to be bound by the 
                terms and provision of this agreement. If you do not agree to abide by the above, 
                please do not use this service.
              </p>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Service Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-4">
                DrKnowItAll is an AI-powered health guidance platform designed to help users:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Understand health symptoms and conditions through conversational AI</li>
                <li>Organize personal health information and medical history</li>
                <li>Prepare for healthcare provider visits with structured summaries</li>
                <li>Access general health information and educational content</li>
                <li>Track health metrics and conversation insights over time</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card border-warning/20">
            <CardHeader>
              <CardTitle className="text-warning">Medical Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-warning/10 p-4 rounded-lg mb-4">
                <p className="text-warning font-medium">
                  ⚠️ IMPORTANT: DrKnowItAll is NOT a substitute for professional medical advice, 
                  diagnosis, or treatment.
                </p>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Always seek the advice of your physician or qualified healthcare provider</li>
                <li>Never disregard professional medical advice because of information from DrKnowItAll</li>
                <li>DrKnowItAll cannot diagnose conditions or prescribe medications</li>
                <li>In case of medical emergency, contact emergency services immediately</li>
                <li>The AI responses are for informational and educational purposes only</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Account Security</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Maintain the confidentiality of your account credentials</li>
                    <li>Notify us immediately of any unauthorized account use</li>
                    <li>Use strong, unique passwords for your account</li>
                    <li>Enable two-factor authentication when available</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Appropriate Use</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Use the service only for legitimate health guidance purposes</li>
                    <li>Provide accurate and truthful information in your health profile</li>
                    <li>Respect the AI system and avoid attempting to manipulate responses</li>
                    <li>Not share account access with others</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Prohibited Activities</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Using the service for any illegal or unauthorized purpose</li>
                    <li>Attempting to access other users' accounts or data</li>
                    <li>Uploading malicious code or attempting to harm the system</li>
                    <li>Using the service to provide medical advice to others</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Subscription and Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Billing</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Subscription fees are billed monthly in advance</li>
                    <li>All fees are non-refundable unless otherwise stated</li>
                    <li>We reserve the right to change pricing with 30 days notice</li>
                    <li>Failed payments may result in service suspension</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Cancellation</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>You may cancel your subscription at any time</li>
                    <li>Cancellation takes effect at the end of the current billing cycle</li>
                    <li>No refunds for partial months or unused features</li>
                    <li>Data export options available before account closure</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>DrKnowItAll and all related content are owned by our company and licensors</li>
                <li>You retain ownership of your personal health data and conversations</li>
                <li>You grant us limited rights to process your data to provide the service</li>
                <li>You may not copy, modify, or distribute our proprietary AI technology</li>
                <li>Our trademarks and service marks may not be used without permission</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground font-medium">
                  To the maximum extent permitted by law, DrKnowItAll shall not be liable for any damages 
                  arising from your use of the service.
                </p>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We provide the service "as is" without warranties of any kind</li>
                <li>We do not guarantee the accuracy or completeness of AI responses</li>
                <li>You assume all risks associated with using health guidance information</li>
                <li>Our liability is limited to the amount you paid for the service</li>
                <li>We are not responsible for decisions made based on AI recommendations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Your privacy is important to us. Please review our Privacy Policy for detailed 
                information about how we collect, use, and protect your data.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We follow enterprise-grade security and data protection standards</li>
                <li>Your health data is encrypted and securely stored</li>
                <li>You have rights to access, correct, and delete your data</li>
                <li>We do not sell your personal information to third parties</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                <li>Maintenance windows may temporarily affect service availability</li>
                <li>We reserve the right to modify or discontinue features with notice</li>
                <li>Emergency maintenance may occur without advance notice</li>
                <li>Service credits may be available for extended outages</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Either party may terminate this agreement at any time</li>
                <li>We may suspend or terminate accounts for terms violations</li>
                <li>Upon termination, your access to the service will cease</li>
                <li>Data export options available for 30 days after termination</li>
                <li>Certain provisions survive termination (privacy, liability, etc.)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will provide notice 
                of material changes via email or through the service. Continued use after changes 
                constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Email:</strong> legal@drknowitall.ai</p>
                <p><strong>Phone:</strong> 1-800-DRKNOWITALL</p>
                <p><strong>Mail:</strong> DrKnowItAll Legal Department<br />123 Health Street<br />Medical City, MC 12345</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;