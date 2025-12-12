import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  AlertCircle, 
  CheckCircle, 
  Trophy, 
  RefreshCw, 
  ShoppingCart, 
  Gavel, 
  DollarSign, 
  ImageIcon,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import CountdownTimer from './CountdownTimer';

// Item Detail View (Full Screen when clicked)
const ItemDetailView = ({ 
  item, 
  onBack,
  currentBidder,
  onPlaceBid,
  auctionStatus,
  auctionEnded,
  onNeedRegistration,
  itemBids = [],
  onBidPlaced,
  endDate,
  onAuctionExpired
}) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const highestBid = itemBids.length > 0 ? itemBids[0] : null;
  const currentPrice = highestBid ? highestBid.amount : (item.starting_bid || 0);
  const minBid = highestBid ? currentPrice + (item.min_increment || 1) : (item.starting_bid || 1);

  // Check if current bidder is winning
  const isWinning = highestBid && currentBidder && highestBid.bidder_email === currentBidder.email;

  // Buy Now price check
  const hasBuyNow = item.buy_now_price && item.buy_now_price > 0;

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentBidder) {
      onNeedRegistration();
      return;
    }

    const amount = parseFloat(bidAmount);
    
    if (isNaN(amount) || amount < minBid) {
      setBidError(`Minimum bid is $${minBid.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    setBidError('');
    
    try {
      await onPlaceBid(item.item_id, amount);
      setBidSuccess(true);
      setBidAmount('');
      if (onBidPlaced) onBidPlaced();
      setTimeout(() => setBidSuccess(false), 3000);
    } catch (error) {
      setBidError(error.message || 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickBid = async () => {
    if (!currentBidder) {
      onNeedRegistration();
      return;
    }

    setIsSubmitting(true);
    setBidError('');
    
    try {
      await onPlaceBid(item.item_id, minBid);
      setBidSuccess(true);
      if (onBidPlaced) onBidPlaced();
      setTimeout(() => setBidSuccess(false), 3000);
    } catch (error) {
      setBidError(error.message || 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!currentBidder) {
      onNeedRegistration();
      return;
    }

    if (!window.confirm(`Buy this item now for $${item.buy_now_price.toFixed(2)}?`)) return;

    setIsSubmitting(true);
    setBidError('');
    
    try {
      await onPlaceBid(item.item_id, item.buy_now_price);
      setBidSuccess(true);
      if (onBidPlaced) onBidPlaced();
    } catch (error) {
      setBidError(error.message || 'Failed to complete purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get images
  const images = item.images && item.images.length > 0 ? item.images : [];
  // Ensure selectedImage is within bounds
  const safeSelectedImage = images.length > 0 ? Math.min(selectedImage, images.length - 1) : 0;
  const primaryImage = images.length > 0 
    ? images[safeSelectedImage]?.url || images[0].url 
    : null;

  const goToPrevious = () => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <h1 className="font-semibold text-foreground truncate flex-1">{item.title}</h1>
          {isWinning && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Trophy className="w-3 h-3 mr-1" />
              Winning
            </Badge>
          )}
        </div>
        {/* Countdown Timer */}
        {endDate && !auctionEnded && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex justify-center">
            <CountdownTimer endDate={endDate} onExpired={onAuctionExpired} />
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden group">
              {primaryImage ? (
                <img 
                  src={primaryImage} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
              
              {/* Navigation Arrows - only show if more than 1 image */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                    {safeSelectedImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      safeSelectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{item.title}</h2>
              {item.ai_description && (
                <p className="text-muted-foreground mt-2">{item.ai_description}</p>
              )}
            </div>

            {/* Price Card */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Show Current Bid */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {highestBid ? 'Current Bid' : 'Opening Bid'}
                    </div>
                    <div className="text-3xl font-bold text-green-600 flex items-center">
                      <DollarSign className="w-6 h-6" />
                      {currentPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {itemBids.length} bid{itemBids.length !== 1 ? 's' : ''}
                    </div>
                    {highestBid && (
                      <div className="text-sm font-medium text-foreground">
                        Next Bid: ${minBid.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bidding UI */}
                <div className="space-y-3 pt-2 border-t">
                  {bidError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {bidError}
                    </div>
                  )}
                  {bidSuccess && (
                    <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Bid placed successfully!
                    </div>
                  )}

                  {auctionEnded && (
                    <div className="text-center py-4 text-muted-foreground bg-muted rounded-lg">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-medium">Auction has ended</p>
                    </div>
                  )}

                  {!auctionEnded && !currentBidder && (
                    <Button onClick={onNeedRegistration} className="w-full" size="lg">
                      <User className="w-4 h-4 mr-2" />
                      Register to Bid
                    </Button>
                  )}

                  {!auctionEnded && currentBidder && (
                    <>
                      {/* Quick Bid */}
                      <Button 
                        onClick={handleQuickBid}
                        disabled={isSubmitting}
                        className="w-full"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Gavel className="w-4 h-4 mr-2" />
                        )}
                        {highestBid ? `Quick Bid $${minBid.toFixed(2)}` : `Place Opening Bid $${minBid.toFixed(2)}`}
                      </Button>

                      {/* Custom Bid */}
                      <form onSubmit={handleBidSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min={minBid}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder={minBid.toFixed(2)}
                            className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <Button 
                          type="submit"
                          variant="outline"
                          disabled={isSubmitting || !bidAmount}
                        >
                          Bid
                        </Button>
                      </form>

                      {/* Buy Now */}
                      {hasBuyNow && (
                        <Button 
                          onClick={handleBuyNow}
                          disabled={isSubmitting}
                          variant="outline"
                          className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                          size="lg"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy Now ${item.buy_now_price.toFixed(2)}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Item Details */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Item Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Starting Bid</span>
                    <span className="text-foreground">${(item.starting_bid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bid Increment</span>
                    <span className="text-foreground">${(item.min_increment || 1).toFixed(2)}</span>
                  </div>
                  {item.condition && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition</span>
                      <span className="text-foreground">{item.condition}</span>
                    </div>
                  )}
                  {hasBuyNow && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buy Now Price</span>
                      <span className="text-blue-600 font-medium">${item.buy_now_price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bid History */}
            {itemBids.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Bid History</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {itemBids.map((bid, idx) => (
                      <div 
                        key={bid.bid_id || idx}
                        className={`flex justify-between text-sm py-2 px-3 rounded-lg ${
                          idx === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted'
                        }`}
                      >
                        <span className={idx === 0 ? 'text-green-700 font-medium' : 'text-foreground'}>
                          {bid.bidder_name || 'Anonymous'}
                          {bid.bidder_email === currentBidder?.email && ' (You)'}
                        </span>
                        <span className={idx === 0 ? 'text-green-700 font-medium' : 'text-foreground'}>
                          ${bid.amount?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetailView;
