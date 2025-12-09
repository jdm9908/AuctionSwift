import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { ActionTypes, useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { createAuction } from '../services/api';

// Demo mode only available for this email
const DEMO_ALLOWED_EMAIL = 'jdmartin21@icloud.com';

export function NewAuctionPage() {
  const [auctionName, setAuctionName] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { dispatch } = useAuction();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check if current user can create demo auctions
  const canCreateDemo = user?.email?.toLowerCase() === DEMO_ALLOWED_EMAIL.toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auctionName.trim()) {
      return;
    }

    if (!user) {
      setError('You must be logged in to create an auction');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the authenticated user's ID from Supabase Auth
      const auction = await createAuction(user.id, auctionName.trim(), canCreateDemo && isDemo);
      
      // Update local state
      dispatch({
        type: ActionTypes.CREATE_AUCTION,
        payload: {
          auction_id: auction.auction_id,
          auction_name: auction.auction_name,
          profile_id: auction.profile_id,
          status: auction.status || 'draft',
          is_demo: auction.is_demo || false,
          created_at: auction.created_at
        }
      });

      // Navigate to the new auction detail page
      navigate(`/auction/${auction.auction_id}`);
    } catch (err) {
      setError(err.message || 'Failed to create auction');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New Auction</h1>
        <p className="text-muted-foreground">
          Start by giving your auction a name. You can add items in the next step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auction Details</CardTitle>
          <CardDescription>
            Choose a descriptive name that helps you identify this auction later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <Label htmlFor="auction-name">Auction Name</Label>
              <Input
                id="auction-name"
                value={auctionName}
                onChange={(e) => setAuctionName(e.target.value)}
                placeholder="e.g., John's Estate Sale, Spring Collection"
                className="mt-2"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Demo Mode Toggle - Only for authorized email */}
            {canCreateDemo && (
              <div className="p-4 border border-dashed border-purple-300 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="demo-mode" className="text-purple-700 font-medium">Price Guessing Game (Demo)</Label>
                    <p className="text-xs text-purple-600 mt-1">
                      Bidders guess the price instead of bidding. Winner is closest to comp value.
                    </p>
                  </div>
                  <Switch
                    id="demo-mode"
                    checked={isDemo}
                    onCheckedChange={setIsDemo}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!auctionName.trim() || loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Auction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
