import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { 
  Zap, 
  Crown, 
  Shield, 
  MessageCircle, 
  Star, 
  FileText,
  Stethoscope,
  Brain,
  Heart,
  Database,
  Activity
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { TierStatus } from "@/components/TierStatus";

export const DashboardNavMenu = () => {
  const { createCheckoutSession } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await createCheckoutSession();
    } catch (error) {
      console.error("Failed to start checkout:", error);
    }
  };

  const aiFeatures = [
    {
      icon: Brain,
      title: "Advanced AI Analysis",
      description: "Complex medical reasoning powered by Grok AI"
    },
    {
      icon: MessageCircle,
      title: "Natural Conversations",
      description: "Chat naturally about your health concerns"
    },
    {
      icon: Heart,
      title: "Symptom Analysis",
      description: "Track symptoms and get insights over time"
    },
    {
      icon: Database,
      title: "Health Records",
      description: "Store and analyze your health data securely"
    }
  ];

  const plans = [
    {
      name: "Free Tier",
      price: "$0",
      period: "forever",
      icon: MessageCircle,
      features: [
        "Basic health questions",
        "General wellness info",
        "No data storage",
        "Standard response time"
      ],
      color: "text-muted-foreground"
    },
    {
      name: "Pro Tier",
      price: "$2",
      period: "per month",
      icon: Crown,
      features: [
        "Unlimited health questions",
        "Advanced AI analysis",
        "Health profile tracking",
        "Conversation history",
        "Priority processing"
      ],
      color: "text-primary",
      popular: true
    }
  ];

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="text-sm font-medium">
            How Our AI Works
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-6 w-[500px]">
              <div className="row-span-3">
                <NavigationMenuLink asChild>
                  <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/20 to-primary/30 p-6 no-underline outline-none focus:shadow-md">
                    <Stethoscope className="h-6 w-6 text-primary" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      DrKnowItAll AI
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Powered by advanced Grok AI technology for comprehensive health guidance
                    </p>
                  </div>
                </NavigationMenuLink>
              </div>
              <div className="grid gap-3 mt-4">
                {aiFeatures.map((feature) => (
                  <Card key={feature.title} className="border-none shadow-none">
                    <CardContent className="flex gap-3 p-3">
                      <feature.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className="text-sm font-medium">
            Pricing Tiers
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-4 p-6 w-[600px]">
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <Card key={plan.name} className={`${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <plan.icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{plan.name}</h3>
                              {plan.popular && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                  Popular
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">{plan.price}</span>
                              <span className="text-sm text-muted-foreground">/{plan.period}</span>
                            </div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <div className="h-1 w-1 bg-primary rounded-full" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {plan.popular && (
                          <Button size="sm" onClick={handleUpgrade} className="btn-primary">
                            Upgrade
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Current Plan:</span>
                  <TierStatus showUpgradeButton={false} />
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};