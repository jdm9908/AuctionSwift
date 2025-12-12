import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trash2, Settings, Eye, TrendingUp, Copy, ExternalLink, Send, Clock, Loader2, CheckCheck } from 'lucide-react';
import { ItemMultiForm } from '../components/ItemMultiForm';
import { ItemCard } from '../components/ItemCard';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuction } from '../context/AuctionContext';
import { deleteAuction, closeAuction, getAuctionBids, exportAuctionExcel } from '../services/api';
import { ActionTypes } from '../context/AuctionContext';
import { formatCurrency, copyToClipboard } from '../lib/utils';

export function AuctionDetailPage() {
  const { auction_id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAuction();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [winners, setWinners] = useState([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const exportMenuRef = useRef(null);

  // Reset state when auction_id changes (navigating between auctions)
  useEffect(() => {
    setShowExportMenu(false);
    setIsDeleting(false);
    setSuccessMessage('');
    setWinners([]);
  }, [auction_id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const auction = state.auctions.find(a => a.auction_id === auction_id);
  const auctionItems = state.items.filter(item => item.auction_id === auction_id);

  // Fetch winners when auction is closed
  useEffect(() => {
    const fetchWinners = async () => {
      if (auction?.status === 'closed') {
        setLoadingWinners(true);
        try {
          const data = await getAuctionBids(auction_id);
          const winnersList = data?.items_with_bids
            ?.filter(item => (item.bids && item.bids.length > 0) || item.highest_bid)
            ?.map(item => {
              const topBid = item.bids?.[0];
              return {
                itemName: item.name || item.title,
                itemId: item.item_id,
                winnerName: topBid?.bidder_name || 'Anonymous',
                winnerEmail: topBid?.bidder_email || 'N/A',
                winningBid: topBid?.amount || item.highest_bid || 0,
                isSold: item.is_sold
              };
            }) || [];
          setWinners(winnersList);
        } catch (err) {
          console.error('Failed to fetch winners:', err);
        } finally {
          setLoadingWinners(false);
        }
      }
    };
    fetchWinners();
  }, [auction?.status, auction_id]);

  const handleCopyEmail = async (email) => {
    const success = await copyToClipboard(email);
    if (success) {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const handleExport = async (format) => {
    if (format === "excel") {
      await exportAuctionExcel(auction_id, auction.auction_name);
    }
  };


  const handlePublish = () => {
    // Navigate to settings page to configure before publishing
    navigate(`/auction/${auction_id}/settings`);
  };

  const handleClose = async () => {
    setActionLoading('close');
    try {
      await closeAuction(auction_id);
      // Update local state with new status
      dispatch({
        type: ActionTypes.UPDATE_AUCTION,
        payload: {
          auction_id: auction_id,
          updates: { status: 'closed' }
        }
      });
      setSuccessMessage('Auction closed successfully!');
    } catch (err) {
      alert(err.message || 'Failed to close auction');
    } finally {
      setActionLoading('');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auction/${auction_id}/public`);
    setSuccessMessage('Link copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteAuction = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${auction.auction_name}"?\n\n` +
      `This will permanently delete:\n` +
      `• ${auctionItems.length} item(s)\n` +
      `• All associated images\n` +
      `• All comparable sales data\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteAuction(auction_id);
      
      // Remove from local state
      dispatch({
        type: ActionTypes.DELETE_AUCTION,
        payload: { auction_id }
      });

      // Navigate to new auction page
      navigate('/new');
      
    } catch (error) {
      console.error('Failed to delete auction:', error);
      alert('Failed to delete auction. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    const status = auction?.status || 'draft';
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      published: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!auction) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Auction not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{auction.auction_name}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            Created {new Date(auction.created_at).toLocaleDateString()}
            {auctionItems.length > 0 && ` • ${auctionItems.length} ${auctionItems.length === 1 ? 'item' : 'items'}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Auction Settings Button - Only when published or closed */}
          {(auction.status === 'published' || auction.status === 'closed') && (
            <Link to={`/auction/${auction_id}/settings`}>
              <Button variant="outline" size="icon" title="Auction Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {/* Preview Button - Only when draft */}
          {auction.status === 'draft' && (
            <Link to={`/auction/${auction_id}/public`} target="_blank">
              <Button variant="outline" size="icon" title="Preview Public Auction">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {/* View Live Auction Button - Only when published */}
          {auction.status === 'published' && (
            <Link to={`/auction/${auction_id}/public`} target="_blank">
              <Button variant="outline" size="icon" title="View Live Auction">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {/* Publish Button - Only when draft (goes to settings first) */}
          {auction.status === 'draft' && (
            <Button onClick={handlePublish}>
              <Send className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}

          {/* Track Bids Button - Only when published (black button like Publish) */}
          {auction.status === 'published' && (
            <Link to={`/auction/${auction_id}/bids`}>
              <Button>
                <TrendingUp className="h-4 w-4 mr-2" />
                Track Bids
              </Button>
            </Link>
          )}

          {/* Close Button - Only when published */}
          {auction.status === 'published' && (
            <Button variant="destructive" onClick={handleClose} disabled={actionLoading === 'close'}>
              {actionLoading === 'close' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Close
            </Button>
          )}

          {/* Delete Button - Only when draft */}
          {auction.status === 'draft' && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteAuction}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
          {successMessage}
        </div>
      )}

      {/* Share Link - Visible when published */}
      {auction.status === 'published' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-blue-800 mb-2">Share your live auction:</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/auction/${auction_id}/public`}
                className="bg-white"
              />
              <Button onClick={copyShareLink} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Link to={`/auction/${auction_id}/public`} target="_blank">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed Auction Notice */}
      {auction.status === 'closed' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-4 flex items-center justify-center">
            <p className="text-sm font-medium text-red-800 text-center">
              This auction has been closed. No new bids can be placed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Winners Section - Shows when auction is closed */}
      {auction.status === 'closed' && (
        <Card className="border-2 border-yellow-400 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              Auction Winners
              <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                {winners.length} Winner{winners.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Contact winners to arrange payment and delivery
            </p>
          </CardHeader>
          <CardContent>
            {loadingWinners ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : winners.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bids were placed on any items</p>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase px-3 py-2 bg-muted/50 rounded-lg">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-3">Winner</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                
                {/* Winners List */}
                {winners.map((winner, index) => (
                  <div
                    key={winner.itemId}
                    className={`grid grid-cols-12 gap-4 px-3 py-3 rounded-lg items-center ${
                      winner.isSold ? 'bg-green-50' : index % 2 === 0 ? 'bg-muted/20' : ''
                    }`}
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="font-medium truncate">{winner.itemName}</span>
                      {winner.isSold && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          Paid
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm">{winner.winnerName}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-1">
                      <a 
                        href={`mailto:${winner.winnerEmail}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        {winner.winnerEmail}
                      </a>
                      <button
                        onClick={() => handleCopyEmail(winner.winnerEmail)}
                        className="p-1 hover:bg-muted rounded"
                        title="Copy email"
                      >
                        {copiedEmail === winner.winnerEmail ? (
                          <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-green-600">{formatCurrency(winner.winningBid)}</span>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="grid grid-cols-12 gap-4 px-3 py-3 mt-2 border-t-2 border-dashed">
                  <div className="col-span-10 text-right font-semibold">Total Revenue:</div>
                  <div className="col-span-2 text-right font-bold text-lg text-green-600">
                    {formatCurrency(winners.reduce((sum, w) => sum + (w.winningBid || 0), 0))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add New Items Section - Hide when auction is closed */}
      {auction.status !== 'closed' && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Add New Items</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add multiple items, then click "Generate" to auto-create descriptions and fetch comps
          </p>
          <ItemMultiForm auctionId={auction_id} auctionStatus={auction.status} />
        </div>
      )}

      {/* Existing Items Section */}
      {auctionItems.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Current Items
            </h2>
            <div className="space-y-4">
              {auctionItems.map(item => (
                <ItemCard key={item.item_id} item={item} auctionStatus={auction.status} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
