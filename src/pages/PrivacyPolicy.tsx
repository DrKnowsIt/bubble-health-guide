import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
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
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                DrKnowsIt ("we," "our," or "us") is committed to protecting your privacy and ensuring 
                the security of your personal health information. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our AI-powered 
                medical guidance platform.
              </p>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Name, email address, and contact information</li>
                  <li>Account credentials and authentication data</li>
                  <li>Payment and billing information</li>
                  <li>Profile information and preferences</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Health Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Medical history and health conditions</li>
                  <li>Symptoms and health concerns shared in conversations</li>
                  <li>Medications and treatment information</li>
                  <li>Health metrics and vital signs</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Conversation logs and chat interactions</li>
                  <li>Voice recordings (when voice mode is used)</li>
                  <li>Usage patterns and feature preferences</li>
                  <li>Device and browser information</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide personalized AI medical guidance and recommendations</li>
                <li>Maintain and improve our health profile and conversation features</li>
                <li>Generate health summaries and doctor-ready reports</li>
                <li>Analyze usage patterns to enhance our AI models (anonymized data only)</li>
                <li>Send important updates about your health insights and account</li>
                <li>Provide customer support and respond to your inquiries</li>
                <li>Ensure platform security and prevent fraudulent activities</li>
              </ul>
            </CardContent>
          </Card>

           <Card className="medical-card">
            <CardHeader>
              <CardTitle>Data Research and Pattern Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary-light))] p-4 rounded-lg mb-4">
                <p className="text-[hsl(var(--primary))] font-medium">
                  🔬 We collect anonymized health data to discover medical patterns that traditional 
                  research and individual doctors may not be able to identify.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Our Research Mission:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Analyze anonymized health conversations to identify emerging health trends</li>
                    <li>Discover correlations between symptoms, conditions, and treatments</li>
                    <li>Identify patterns that could lead to earlier disease detection</li>
                    <li>Improve AI accuracy through large-scale health data analysis</li>
                    <li>Contribute to medical research by finding previously unknown connections</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Privacy Protection in Research:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>All personal identifiers (names, addresses, phone numbers) are completely removed</li>
                    <li>Data is aggregated and analyzed in ways that cannot identify individuals</li>
                    <li>Geographic information is generalized to broad regions only</li>
                    <li>Age and demographic data is grouped into ranges, not specific values</li>
                    <li>Multiple layers of anonymization ensure your privacy is protected</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Potential Benefits:</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Earlier detection of disease outbreaks or health trends</li>
                    <li>Better understanding of how different conditions interact</li>
                    <li>Improved treatment recommendations based on population-wide data</li>
                    <li>Advancement of personalized medicine through pattern recognition</li>
                    <li>Contribution to global health research and medical breakthroughs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

           <Card className="medical-card">
            <CardHeader>
              <CardTitle>Data Security and Breach Notification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent-light p-4 rounded-lg mb-4">
                <p className="text-accent-foreground font-medium">
                  🔒 DrKnowsIt employs security measures to protect your health information.
                </p>
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Health data is encrypted in transit and at rest</li>
                <li>Access to your information is limited to authorized personnel</li>
                <li>We maintain audit logs of data access</li>
                <li>Regular security assessments are conducted</li>
                <li>Security architecture protects against data breaches</li>
              </ul>
              
              <div className="mt-6 p-4 border border-warning/20 bg-warning/10 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Breach Notification Procedures</h4>
                <p className="text-muted-foreground text-sm">
                  In the unlikely event of a data security incident affecting your personal health information, 
                  we will notify you within 72 hours of discovery. Notification will include details about 
                  what information may have been involved, steps we are taking to address the incident, 
                  and recommendations for protecting your information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Information Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We do not sell, trade, or rent your personal information. We may share your 
                information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>With your consent:</strong> When you explicitly authorize sharing with healthcare providers</li>
                <li><strong>Service providers:</strong> With trusted partners who assist in platform operations (under strict data agreements)</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect the rights and safety of our users</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition (with continued privacy protections)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Health conversations and profiles are retained as long as your account is active</li>
                <li>You can delete individual conversations or your entire health profile at any time</li>
                <li>Account information is retained for 30 days after account deletion</li>
                <li>Anonymized usage data may be retained for service improvement purposes</li>
                <li>We comply with all applicable data retention requirements</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request a copy of all personal information we have about you</li>
                <li><strong>Correction:</strong> Update or correct any inaccurate information in your profile</li>
                <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
                <li><strong>Portability:</strong> Export your health data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications</li>
                <li><strong>Restriction:</strong> Limit how we process certain types of your information</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Encryption for data transmission</li>
                <li>Firewalls and security monitoring</li>
                <li>Multi-factor authentication for account access</li>
                <li>Secure data storage and access controls</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p><strong>Email:</strong> support@drknowit.com</p>
                <p><strong>Phone:</strong> 919-616-6125</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;