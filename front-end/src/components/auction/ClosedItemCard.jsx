import { memo, useState } from 'react';
import { ImageIcon, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

// Closed Auction Item Card - memoized for performance
const ClosedItemCard = memo(function ClosedItemCard({ item, itemBids = [] }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const highestBid = itemBids.length > 0 ? itemBids[0] : null;
  const finalPrice = highestBid ? highestBid.amount : 0;
  const hasWinner = highestBid !== null;

  const images = item.images && item.images.length > 0 ? item.images : [];
  const safeIndex = images.length > 0 ? Math.min(currentImageIndex, images.length - 1) : 0;
  const currentImage = images.length > 0 ? images[safeIndex]?.url : null;

  const goToPrevious = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Card className={`overflow-hidden ${hasWinner ? 'ring-2 ring-green-500' : ''}`}>
      {/* Image with Carousel */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden group">
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={item.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Navigation Arrows - only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* Image Counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
              {safeIndex + 1}/{images.length}
            </div>
          </>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          {hasWinner ? (
            <Badge className="bg-green-500 text-white border-0 text-xs">
              SOLD
            </Badge>
          ) : (
            <Badge className="bg-gray-500 text-white border-0 text-xs">
              No Bids
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{item.title}</h3>
        
        <div className="flex items-center justify-between mt-2">
          {hasWinner ? (
            <>
              <div className="text-lg font-bold text-green-600">${finalPrice.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                {itemBids.length} bid{itemBids.length !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">No bids</div>
              <div className="text-xs text-muted-foreground">Start: ${(item.starting_bid || 0).toFixed(2)}</div>
            </>
          )}
        </div>
        
        {hasWinner && (
          <div className="text-xs text-muted-foreground mt-1">
            Winner: <span className="font-medium text-foreground">{highestBid.bidder_name || 'Anonymous'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ClosedItemCard;
