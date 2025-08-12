import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface PlanSelectionCardProps {
  description?: string;
}

export const PlanSelectionCard = ({ description }: PlanSelectionCardProps) => {
  const { createCheckoutSession } = useSubscription();

  const plans = [
    {
      name: "Basic",
      price: "$25",
      period: "per month",
      description: "Essential AI health guidance for a single user with 4 core health forms",
      features: [
        "Answer basic health questions",
        "Manage 1 user",
        "4 essential health forms",
        "General wellness information",
        "Basic conversation history",
        "Personal data storage"
      ],
      icon: Zap,
      tier: 'basic' as const,
      popular: false
    },
    {
      name: "Pro",
      price: "$50",
      period: "per month", 
      description: "Complete AI health guidance with up to 10 users and all 11 comprehensive health forms",
      features: [
        "Unlimited health questions",
        "Manage up to 10 users",
        "All 11 comprehensive health forms",
        "Complex medical reasoning & analysis",
        "Health profile management",
        "Complete conversation history",
        "Health records & data organization",
        "Symptom pattern analysis over time"
      ],
      icon: Crown,
      tier: 'pro' as const,
      popular: true
    }
  ];

  const handleUpgrade = async (tier: 'basic' | 'pro') => {
    try {
      await createCheckoutSession(tier);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    }
  };

  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      <CardHeader className="text-center relative">
        <CardTitle className="text-xl mb-2">Choose Your Plan</CardTitle>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`
                relative transition-all hover:scale-[1.02] h-full flex flex-col
                ${plan.popular ? 'ring-2 ring-primary shadow-lg' : 'border-muted'}
              `}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <div className={`
                    flex h-10 w-10 items-center justify-center rounded-lg text-white
                    ${plan.popular ? 'bg-primary' : 'bg-muted-foreground'}
                  `}>
                    <plan.icon className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-foreground">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handleUpgrade(plan.tier)}
                  className={`w-full ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};