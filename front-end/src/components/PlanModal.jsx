import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function PlanModal({ open, onOpenChange }) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Simple Pricing</DialogTitle>
        </DialogHeader>

        <div className="px-2 pb-4">
          <Card className="border-primary">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">EstateBid</CardTitle>
              <CardDescription className="text-xs">Everything you need to run your auctions</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold">3%</span>
                <p className="text-muted-foreground text-sm mt-1">on auction volume</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 mb-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" size="sm" onClick={() => onOpenChange(false)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
