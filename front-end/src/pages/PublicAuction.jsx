import { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { getPublicAuction, placeBid, getAuctionBids, getDemoResults } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  AlertCircle,
  Package,
  Eye,
  Search,
  RefreshCw,
  User,
  Trophy,
  Target
} from 'lucide-react';

// Import auction components
import {
  CountdownTimer,
  BidderModal,
  ItemCard,
  ClosedItemCard,
  ItemDetailView
} from '../components/auction';

// Main Public Auction Page
const PublicAuction = () => {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [items, setItems] = useState([]);
  const [allBids, setAllBids] = useState({}); // { itemId: [bids] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBidder, setCurrentBidder] = useState(null);
  const [showBidderModal, setShowBidderModal] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [demoResults, setDemoResults] = useState(null); // Demo mode results

  // Handle auction expiry - fetch demo results if needed
  const handleAuctionExpired = useCallback(async () => {
    setAuctionEnded(true);
    setSelectedItem(null); // Go back to grid view
    if (auction?.is_demo) {
      try {
        const demoData = await getDemoResults(auctionId);
        setDemoResults(demoData);
      } catch (e) {
        console.error('Failed to fetch demo results:', e);
      }
    }
  }, [auction?.is_demo, auctionId]);

  // Fetch all bids for all items in the auction
  const fetchAllBids = useCallback(async () => {
    if (!auctionId) return;
    try {
      const data = await getAuctionBids(auctionId);
      // Transform items_with_bids into a map of itemId -> bids
      const bidsMap = {};
      if (data?.items_with_bids) {
        data.items_with_bids.forEach(item => {
          bidsMap[item.item_id] = item.bids || [];
        });
      }
      setAllBids(bidsMap);
    } catch (err) {
      console.error('Failed to fetch bids:', err);
    }
  }, [auctionId]);

  // Check for existing bidder in sessionStorage
  useEffect(() => {
    const storedBidder = sessionStorage.getItem(`bidder_${auctionId}`);
    if (storedBidder) {
      try {
        setCurrentBidder(JSON.parse(storedBidder));
      } catch (e) {
        console.error('Failed to parse stored bidder:', e);
      }
    }
  }, [auctionId]);

  // Load auction data
  useEffect(() => {
    const loadAuction = async () => {
      try {
        setLoading(true);
        const data = await getPublicAuction(auctionId);
        console.log('Auction data loaded:', data);
        console.log('End time:', data.auction?.end_time || data.end_time);
        
        // API returns { auction: {...}, items: [...] }
        const auctionData = data.auction || data;
        const itemsData = data.items || [];
        
        setAuction(auctionData);
        setItems(itemsData);
        
        // Check if auction is closed (by status or end date)
        const isClosed = auctionData.status === 'closed';
        const isExpired = auctionData.end_time && new Date(auctionData.end_time) < new Date();
        
        if (isClosed || isExpired) {
          setAuctionEnded(true);
          // Fetch demo results if it's a demo auction
          if (auctionData.is_demo) {
            try {
              const demoData = await getDemoResults(auctionId);
              setDemoResults(demoData);
            } catch (e) {
              console.error('Failed to fetch demo results:', e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load auction:', err);
        setError(err.message || 'Failed to load auction');
      } finally {
        setLoading(false);
      }
    };

    loadAuction();
  }, [auctionId]);

  // Fetch bids initially and refresh every 5 seconds (only if auction not ended)
  useEffect(() => {
    fetchAllBids();
    
    if (!auctionEnded) {
      const interval = setInterval(fetchAllBids, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchAllBids, auctionEnded]);

  // Handle bidder registration
  const handleRegisterBidder = (bidderData) => {
    setCurrentBidder(bidderData);
    sessionStorage.setItem(`bidder_${auctionId}`, JSON.stringify(bidderData));
  };

  // Handle placing a bid
  const handlePlaceBid = async (itemId, amount) => {
    if (!currentBidder) {
      setShowBidderModal(true);
      throw new Error('Please register to bid');
    }

    return await placeBid(itemId, currentBidder.email, currentBidder.name, amount);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    return item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // If an item is selected, show detail view
  if (selectedItem) {
    return (
      <>
        <ItemDetailView
          item={selectedItem}
          onBack={() => setSelectedItem(null)}
          currentBidder={currentBidder}
          onPlaceBid={handlePlaceBid}
          auctionStatus={auction?.status}
          auctionEnded={auctionEnded}
          onNeedRegistration={() => setShowBidderModal(true)}
          itemBids={allBids[selectedItem.item_id] || []}
          onBidPlaced={fetchAllBids}
          endDate={auction?.end_time}
          onAuctionExpired={handleAuctionExpired}
          isDemo={auction?.is_demo}
        />
        <BidderModal
          isOpen={showBidderModal}
          onClose={() => setShowBidderModal(false)}
          onRegister={handleRegisterBidder}
          isDemo={auction?.is_demo}
        />
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading auction...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Auction Not Found</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Draft preview
  if (auction?.status === 'draft') {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-yellow-800">
            <Eye className="w-5 h-5" />
            <span className="font-medium">Preview Mode</span>
            <span className="text-sm">— This auction is not yet published.</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 mb-2">Draft</Badge>
            <h1 className="text-3xl font-bold text-foreground">{auction.auction_name || 'Untitled Auction'}</h1>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
              <ItemCard
                key={item.item_id}
                item={item}
                onClick={() => setSelectedItem(item)}
                currentBidder={null}
                itemBids={allBids[item.item_id] || []}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Closed auction
  if (auction?.status === 'closed' || auctionEnded) {
    // Demo auction closed - show price guessing results
    if (auction?.is_demo && demoResults) {
      return (
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">Demo</Badge>
                    <Badge className="bg-red-100 text-red-700 border-red-200">Closed</Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{auction.auction_name || 'Price Guessing Game'}</h1>
                </div>
                
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Game Over - See Results!</span>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">🎉 Final Results 🎉</h2>
              <p className="text-muted-foreground">Winners are those who guessed closest to the actual value!</p>
            </div>

            {demoResults.results?.map((result, index) => (
              <Card key={result.item.item_id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3">
                  <h3 className="font-bold text-lg">Item #{index + 1}: {result.item.title}</h3>
                </div>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Item Image */}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {result.item.images?.[0]?.url ? (
                        <img src={result.item.images[0].url} alt={result.item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Results */}
                    <div className="space-y-4">
                      {/* Actual Value */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-sm text-green-600 font-medium">Actual Value (Average of Comps)</div>
                        <div className="text-3xl font-bold text-green-700">${result.avg_comp_price?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-green-600">Based on {result.comp_count} comparable sale{result.comp_count !== 1 ? 's' : ''}</div>
                      </div>

                      {/* Top 3 Closest Guesses */}
                      {result.guesses?.length > 0 && (
                        <div className="bg-gradient-to-b from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg p-4">
                          <div className="text-center mb-3">
                            <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                            <h4 className="font-bold text-yellow-800">Top 3 Closest Guesses</h4>
                          </div>
                          <div className="space-y-2">
                            {result.guesses.slice(0, 3).map((guess, i) => (
                              <div 
                                key={guess.bid_id} 
                                className={`flex justify-between items-center px-4 py-3 rounded-lg ${
                                  i === 0 
                                    ? 'bg-yellow-200 border-2 border-yellow-400 shadow-sm' 
                                    : i === 1 
                                      ? 'bg-gray-100 border border-gray-300' 
                                      : 'bg-amber-100 border border-amber-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`text-2xl ${i === 0 ? '' : 'opacity-70'}`}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                  </span>
                                  <div>
                                    <div className={`font-bold ${i === 0 ? 'text-yellow-800' : 'text-gray-700'}`}>
                                      {guess.bidder_name || 'Anonymous'}
                                    </div>
                                    <div className={`text-sm ${i === 0 ? 'text-yellow-700' : 'text-gray-600'}`}>
                                      Guessed: ${guess.amount?.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-right ${i === 0 ? 'text-yellow-800' : 'text-gray-600'}`}>
                                  <div className="text-xs">Off by</div>
                                  <div className="font-bold">${guess.difference?.toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.guesses?.length === 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <div className="text-muted-foreground">No guesses submitted for this item</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Regular closed auction
    return (
      <div className="min-h-screen bg-background">
        {/* Header - matches live auction style */}
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-red-100 text-red-700 border-red-200">Closed</Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground">{auction.auction_name || 'Untitled Auction'}</h1>
                {auction.description && (
                  <p className="text-sm text-muted-foreground mt-1">{auction.description}</p>
                )}
              </div>
              
              {/* Auction Ended Notice */}
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Bidding has ended</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Final Results</h2>
            <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No items in this auction</p>
                </CardContent>
              </Card>
            ) : (
              items.map(item => (
                <ClosedItemCard
                  key={item.item_id}
                  item={item}
                  itemBids={allBids[item.item_id] || []}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Live Auction
  const isDemo = auction?.is_demo;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isDemo ? (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">🎯 Price Guessing Game</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Live</Badge>
                )}
                {auctionEnded && <Badge variant="destructive">Ended</Badge>}
              </div>
              <h1 className="text-2xl font-bold text-foreground">{auction.auction_name || 'Untitled Auction'}</h1>
              {isDemo && (
                <p className="text-sm text-purple-600 mt-1">Guess the price! Closest to the actual value wins!</p>
              )}
            </div>
            
            {/* Countdown Timer - always show */}
            {auction.end_time ? (
              !auctionEnded && (
                <CountdownTimer 
                  endDate={auction.end_time} 
                  onExpired={handleAuctionExpired}
                />
              )
            ) : (
              <Badge variant="outline" className="text-muted-foreground">No end date set</Badge>
            )}
          </div>

          {/* Bidder Info */}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            {currentBidder ? (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-muted-foreground">Bidding as </span>
                <span className="font-medium text-foreground">{currentBidder.name}</span>
              </div>
            ) : (
              <Button onClick={() => setShowBidderModal(true)}>
                <User className="w-4 h-4 mr-2" />
                Register to Bid
              </Button>
            )}

            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {auction.description && (
          <p className="text-muted-foreground mb-6">{auction.description}</p>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredItems.length} Item{filteredItems.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {/* Items Grid - Click to expand */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items available</p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map(item => (
              <ItemCard
                key={item.item_id}
                item={item}
                onClick={() => setSelectedItem(item)}
                currentBidder={currentBidder}
                auctionEnded={auctionEnded}
                itemBids={allBids[item.item_id] || []}
              />
            ))
          )}
        </div>
      </main>

      {/* Bidder Modal */}
      <BidderModal
        isOpen={showBidderModal}
        onClose={() => setShowBidderModal(false)}
        onRegister={handleRegisterBidder}
        isDemo={auction?.is_demo}
      />
    </div>
  );
};

export default PublicAuction;
