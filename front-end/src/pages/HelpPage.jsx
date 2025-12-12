import { Book, Mail, MessageCircle, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

export function HelpPage() {
  const faqs = [
    {
      question: 'How do I create a new auction?',
      answer: 'Click the "New Auction" button in the sidebar, give your auction a name, and start adding items. You can add multiple items at once using the stacked form.'
    },
    {
      question: 'How does the AI description generator work?',
      answer: 'After adding your items with basic details and photos, click "Generate Descriptions & Find Comps". Our AI will analyze your items and create professional descriptions automatically.'
    },
    {
      question: 'What are comparable sales (comps)?',
      answer: 'Comps are recent sales of similar items that help you price your auction items accurately. We automatically search multiple sources to find relevant comps for your items.'
    },
    {
      question: 'Can I edit items after adding them?',
      answer: 'Yes! Click on any auction in the sidebar to view its items. You can edit or delete items at any time before the auction goes live.'
    },
    {
      question: 'How do I export my auction data?',
      answer: 'Pro and Enterprise users can export auction data to CSV or PDF format from the auction detail page. This feature is available in the action menu.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <Book className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Documentation</CardTitle>
            <CardDescription>
              Browse our comprehensive guides
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <MessageCircle className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Live Chat</CardTitle>
            <CardDescription>
              Chat with our support team
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <Mail className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Email Support</CardTitle>
            <CardDescription>
              Send us a detailed message
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            <CardTitle>Frequently Asked Questions</CardTitle>
          </div>
          <CardDescription>
            Quick answers to common questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index}>
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
                {index < faqs.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Our support team is here to assist you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Can't find what you're looking for? Contact our support team and we'll get back to you as soon as possible.
          </p>
          <div className="flex gap-3">
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
            <Button variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Email: support@estatebid.com</p>
            <p>Hours: Monday - Friday, 9am - 5pm EST</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
