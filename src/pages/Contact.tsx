import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { Header } from "@/components/Header";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Footer } from "@/components/LandingPageComponents";
import { AuthModal } from "@/components/modals/AuthModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(1, "Please enter a subject").max(200),
  message: z.string().trim().min(1, "Please write a message").max(5000),
});

const Contact = () => {
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Please check your input";
      toast({ title: "Couldn't send", description: first, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1) Always persist to DB first (backup of every message)
      const { error: insertError } = await supabase.from("contact_messages").insert({
        user_id: user?.id ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        source_page: typeof window !== "undefined" ? window.location.pathname : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });

      if (insertError) {
        throw insertError;
      }

      // 2) Best-effort email forwarding (will start working once email is set up)
      try {
        await supabase.functions.invoke("send-contact-message", {
          body: parsed.data,
        });
      } catch (emailErr) {
        // Non-fatal — the message is safely in the DB
        logger.warn("Contact email forwarding skipped", emailErr);
      }

      setSubmitted(true);
      setForm({ name: "", email: user?.email ?? "", subject: "", message: "" });
      toast({
        title: "Message received",
        description: "Thanks — we'll get back to you soon.",
      });
    } catch (err) {
      logger.error("Contact submission failed", err);
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {user ? (
        <DashboardHeader />
      ) : (
        <Header onSignIn={() => openAuth("signin")} onSignUp={() => openAuth("signup")} />
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="py-16 text-center gradient-hero">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl mb-4">
            Contact & Help
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Questions, feedback, or something not working? Send us a note and we'll reply by email.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
            <CardDescription>
              We read every message. For urgent medical concerns, please contact a healthcare
              professional or emergency services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center text-center py-8 gap-3">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <h2 className="text-xl font-semibold">Thanks — we got it</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your message is on its way. We'll reply to the email address you provided.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={handleChange("name")}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange("email")}
                      maxLength={255}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={handleChange("subject")}
                    maxLength={200}
                    placeholder="What's this about?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={handleChange("message")}
                    maxLength={5000}
                    rows={7}
                    placeholder="Tell us what's on your mind…"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {form.message.length}/5000
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer onSignUp={() => openAuth("signup")} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
};

export default Contact;
