import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function PlanPage() {
  const features = [
    'Unlimited auctions',
    'Unlimited items',
    'AI-powered descriptions',
    'Automatic comp finding',
    'Priority support',
    'Export to CSV/PDF',
    'Multiple team members',
    'Custom branding'
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Simple Pricing</h1>
        <p className="text-muted-foreground">
          One simple fee. No hidden costs.
        </p>
      </div>

      {/* Single Pricing Card */}
      <div className="max-w-md mx-auto">
        <Card className="border-primary shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">EstateBid</CardTitle>
            <CardDescription>Everything you need to run your auctions</CardDescription>
            <div className="mt-6">
              <span className="text-6xl font-bold">3%</span>
              <p className="text-muted-foreground mt-2">on auction volume</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="bg-muted rounded-lg p-6 text-center max-w-md mx-auto">
        <h3 className="font-semibold mb-2">Questions?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Contact our team for more information about how our pricing works.
        </p>
        <Button variant="outline">Contact Us</Button>
      </div>
    </div>
  );
}
