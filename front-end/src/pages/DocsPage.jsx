import { useState } from 'react';
import { 
  Book, 
  Rocket, 
  ImagePlus, 
  Sparkles, 
  Share2, 
  Users, 
  Trophy, 
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

export function DocsPage() {
  const [expandedSection, setExpandedSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Rocket,
      content: [
        {
          title: 'Creating Your First Auction',
          steps: [
            'Click "New Auction" in the sidebar',
            'Enter a descriptive name for your auction (e.g., "Johnson Estate Sale - March 2025")',
            'You\'ll be taken to your auction dashboard where you can start adding items'
          ]
        },
        {
          title: 'Understanding the Dashboard',
          description: 'Your auction dashboard shows all items in the auction, their status, and quick actions. Draft auctions appear in the sidebar under "Draft", and once published they move to "Live".'
        }
      ]
    },
    {
      id: 'adding-items',
      title: 'Adding Items',
      icon: ImagePlus,
      content: [
        {
          title: 'Adding Items to Your Auction',
          steps: [
            'From your auction page, use the item form at the top',
            'Enter the brand, model, and year if known',
            'Upload up to 5 photos per item (drag & drop or click to browse)',
            'Add any condition notes (scratches, wear, missing parts, etc.)',
            'Click "Add Item" to save'
          ]
        },
        {
          title: 'Photo Tips',
          tips: [
            'Use good lighting - natural light works best',
            'Capture multiple angles (front, back, sides, bottom)',
            'Photograph any damage, labels, or maker\'s marks',
            'Include size reference if helpful',
            'First photo becomes the thumbnail'
          ]
        }
      ]
    },
    {
      id: 'ai-features',
      title: 'AI Features',
      icon: Sparkles,
      content: [
        {
          title: 'AI Description Generator',
          description: 'Our AI analyzes your item photos and details to generate professional, compelling auction descriptions. It considers the brand, model, year, and any condition notes you provide.',
          steps: [
            'Add your item with photos and basic details',
            'Click "Generate Description" button',
            'Review and edit the generated description if needed',
            'The description will be saved automatically'
          ]
        },
        {
          title: 'Comparable Sales (Comps)',
          description: 'Find what similar items have sold for recently. Our AI searches multiple auction sources to find relevant comparable sales.',
          steps: [
            'Click "Find Comps" on any item',
            'AI searches for recent sales of similar items',
            'Review the comps with prices, dates, and sources',
            'Use this data to set competitive starting prices'
          ]
        },
        {
          title: 'Suggested Starting Price',
          description: 'Based on the comps found, we calculate a suggested starting price (80% of average comp price, rounded to nearest $5). This helps ensure competitive bidding while protecting value.'
        }
      ]
    },
    {
      id: 'publishing',
      title: 'Publishing Your Auction',
      icon: Share2,
      content: [
        {
          title: 'Auction Settings',
          steps: [
            'Click "Settings" on your auction page',
            'Set your auction end date and time',
            'Choose which items to list (approve/reject each)',
            'Set starting prices for each item',
            'Review all settings'
          ]
        },
        {
          title: 'Going Live',
          steps: [
            'Once settings are configured, click "Publish Auction"',
            'Your auction moves from "Draft" to "Live" in the sidebar',
            'A shareable public link is generated',
            'Copy and share the link with potential bidders'
          ]
        },
        {
          title: 'Sharing Your Auction',
          description: 'The public auction link can be shared via email, social media, or embedded in websites. Bidders don\'t need an account to view items, but must register their email to place bids.'
        }
      ]
    },
    {
      id: 'bidding',
      title: 'How Bidding Works',
      icon: Users,
      content: [
        {
          title: 'For Bidders',
          steps: [
            'Visit the public auction link',
            'Browse items and view photos/descriptions',
            'Click on an item to see details and bid history',
            'Register with name and email to place bids',
            'Enter bid amount and submit',
            'You\'ll be notified if outbid'
          ]
        },
        {
          title: 'Bid Rules',
          tips: [
            'Bids must be higher than current highest bid',
            'Minimum increment is $1',
            'Bids cannot be retracted',
            'Auction ends at the scheduled time',
            'Highest bidder at closing wins'
          ]
        }
      ]
    },
    {
      id: 'closing',
      title: 'Closing & Winners',
      icon: Trophy,
      content: [
        {
          title: 'Automatic Closing',
          description: 'When your auction end time is reached, bidding automatically stops. The auction status changes from "Live" to "Closed".'
        },
        {
          title: 'Viewing Winners',
          steps: [
            'Go to your closed auction page',
            'View the Winners section showing each item\'s winning bid',
            'See winner name, email, and winning amount',
            'Copy winner emails for easy contact',
            'Mark items as "Sold" once payment is received'
          ]
        },
        {
          title: 'Bid Tracking',
          description: 'The "Bids" page shows all bidding activity in real-time. Track who\'s bidding, how much, and when. Great for monitoring auction health.'
        }
      ]
    },
    {
      id: 'exporting',
      title: 'Exporting Data',
      icon: FileSpreadsheet,
      content: [
        {
          title: 'Excel Export',
          description: 'Export your auction items to an Excel spreadsheet. Includes title, brand, model, year, and image URLs. Perfect for record-keeping or importing into other systems.',
          steps: [
            'Go to your auction page',
            'Click the Export button',
            'Select "Excel" format',
            'Download and open in Excel or Google Sheets'
          ]
        }
      ]
    }
  ];

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Documentation</h1>
        </div>
        <p className="text-muted-foreground">
          Learn how to use EstateBid to run successful estate auctions
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setup Time</p>
                <p className="text-lg font-semibold">5 minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Description</p>
                <p className="text-lg font-semibold">~10 seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Security</p>
                <p className="text-lg font-semibold">Enterprise-grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;
          
          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">{section.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              
              {isExpanded && (
                <CardContent className="pt-0 pb-6">
                  <Separator className="mb-6" />
                  <div className="space-y-6">
                    {section.content.map((item, index) => (
                      <div key={index}>
                        <h3 className="font-semibold text-base mb-3">{item.title}</h3>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {item.description}
                          </p>
                        )}
                        
                        {item.steps && (
                          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
                            {item.steps.map((step, stepIndex) => (
                              <li key={stepIndex}>{step}</li>
                            ))}
                          </ol>
                        )}
                        
                        {item.tips && (
                          <ul className="space-y-2 text-sm text-muted-foreground ml-2">
                            {item.tips.map((tip, tipIndex) => (
                              <li key={tipIndex} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {index < section.content.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Need more help?</h3>
              <p className="text-sm text-muted-foreground">
                Visit the Help page for FAQs and support options, or contact us at{' '}
                <a href="mailto:support@estatebid.com" className="text-primary hover:underline">
                  support@estatebid.com
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
