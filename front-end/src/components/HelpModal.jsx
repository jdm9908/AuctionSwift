import { Book, Mail, MessageCircle, FileQuestion } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

export function HelpModal({ open, onOpenChange }) {
  const faqs = [
    {
      question: 'How do I create a new auction?',
      answer: 'Click the "New Auction" button in the sidebar, give your auction a name, and start adding items.'
    },
    {
      question: 'How does the AI description generator work?',
      answer: 'After adding items, click "Generate". Our AI analyzes your items and creates professional descriptions.'
    },
    {
      question: 'What are comparable sales (comps)?',
      answer: 'Comps are recent sales of similar items that help you price your auction items accurately.'
    },
    {
      question: 'Can I edit items after adding them?',
      answer: 'Yes! Click on any auction in the sidebar to view and edit its items.'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="space-y-4 mt-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="opacity-60">
                <CardHeader className="pb-2">
                  <Book className="h-6 w-6 mb-1 text-muted-foreground" />
                  <CardTitle className="text-sm">Documentation</CardTitle>
                  <CardDescription className="text-xs">
                    Coming Soon
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="opacity-60">
                <CardHeader className="pb-2">
                  <MessageCircle className="h-6 w-6 mb-1 text-muted-foreground" />
                  <CardTitle className="text-sm">Live Chat</CardTitle>
                  <CardDescription className="text-xs">
                    Coming Soon
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="opacity-60">
                <CardHeader className="pb-2">
                  <Mail className="h-6 w-6 mb-1 text-muted-foreground" />
                  <CardTitle className="text-sm">Email</CardTitle>
                  <CardDescription className="text-xs">
                    Coming Soon
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* FAQ Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index}>
                      <h3 className="font-semibold text-sm mb-1">{faq.question}</h3>
                      <p className="text-xs text-muted-foreground">{faq.answer}</p>
                      {index < faqs.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Still need help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  More support options coming soon.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" disabled>
                    <Mail className="h-3 w-3 mr-1.5" />
                    Email - Coming Soon
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <MessageCircle className="h-3 w-3 mr-1.5" />
                    Chat - Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
