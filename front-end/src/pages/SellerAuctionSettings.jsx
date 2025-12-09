// Seller Auction Settings page - for sellers to configure auction and item settings
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Calendar,
  DollarSign,
  Save,
  Eye,
  Send,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  ExternalLink,
  Loader2,
  Copy,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  getAuction,
  listItems,
  updateAuctionSettings,
  publishAuction,
  closeAuction,
  updateItemAuctionSettings,
  batchUpdateItemAuctionSettings
} from '../services/api';

// ============================================
// AUCTION SETTINGS FORM
// ============================================
function AuctionSettingsForm({ auction, onUpdate }) {
  const [settings, setSettings] = useState({
    start_time: auction?.start_time || '',
    end_time: auction?.end_time || '',
    pickup_location: auction?.pickup_location || '',
    shipping_allowed: auction?.shipping_allowed || false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Format datetime-local value
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (auction) {
      setSettings({
        start_time: formatDateTime(auction.start_time),
        end_time: formatDateTime(auction.end_time),
        pickup_location: auction.pickup_location || '',
        shipping_allowed: auction.shipping_allowed || false,
      });
    }
  }, [auction]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {};
      
      if (settings.start_time) {
        updateData.start_time = new Date(settings.start_time).toISOString();
      }
      if (settings.end_time) {
        updateData.end_time = new Date(settings.end_time).toISOString();
      }
      if (settings.pickup_location !== undefined) {
        updateData.pickup_location = settings.pickup_location;
      }
      if (settings.shipping_allowed !== undefined) {
        updateData.shipping_allowed = settings.shipping_allowed;
      }

      await updateAuctionSettings(auction.auction_id, updateData);
      setSuccess('Settings saved successfully!');
      onUpdate();
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Auction Settings
        </CardTitle>
        <CardDescription>
          Configure the timing and logistics for your auction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date/Time Settings */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <div className="flex">
              <button
                type="button"
                onClick={() => document.getElementById('start-time')?.showPicker?.()}
                className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted hover:bg-muted/80 transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </button>
              <Input
                id="start-time"
                type="datetime-local"
                value={settings.start_time}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                className="rounded-l-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <div className="flex">
              <button
                type="button"
                onClick={() => document.getElementById('end-time')?.showPicker?.()}
                className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted hover:bg-muted/80 transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </button>
              <Input
                id="end-time"
                type="datetime-local"
                value={settings.end_time}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                className="rounded-l-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>
        </div>

        {/* Logistics Settings */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pickup-location">Pickup Location</Label>
            <Input
              id="pickup-location"
              type="text"
              value={settings.pickup_location}
              onChange={(e) => setSettings({ ...settings, pickup_location: e.target.value })}
              placeholder="Enter pickup address"
            />
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <div className="flex items-center h-10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.shipping_allowed}
                  onChange={(e) => setSettings({ ...settings, shipping_allowed: e.target.checked })}
                  className="w-4 h-4 rounded border-input"
                />
                <span>Allow Shipping</span>
              </label>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// BATCH ITEM SETTINGS FORM
// ============================================
function BatchItemSettingsForm({ items, onUpdate }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [settings, setSettings] = useState({
    starting_bid: '',
    min_increment: '',
    buy_now_price: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.item_id));
    }
  };

  const toggleItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {};
      if (settings.starting_bid) updateData.starting_bid = parseFloat(settings.starting_bid);
      if (settings.min_increment) updateData.min_increment = parseFloat(settings.min_increment);
      if (settings.buy_now_price) updateData.buy_now_price = parseFloat(settings.buy_now_price);

      if (Object.keys(updateData).length === 0) {
        setError('Please enter at least one setting to update');
        return;
      }

      await batchUpdateItemAuctionSettings(selectedItems, updateData);
      setSuccess(`Updated ${selectedItems.length} items successfully!`);
      setSelectedItems([]);
      setSettings({
        starting_bid: '',
        min_increment: '',
        buy_now_price: '',
      });
      onUpdate();
    } catch (err) {
      setError(err.message || 'Failed to update items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Batch Item Settings
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </CardTitle>
        <CardDescription>
          Update pricing settings for multiple items at once
        </CardDescription>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4">
              {/* Item Selection */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>
                    Select Items ({selectedItems.length} of {items.length} selected)
                  </Label>
                  <Button variant="link" size="sm" onClick={toggleSelectAll} className="h-auto p-0">
                    {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {items.map((item) => (
                    <label
                      key={item.item_id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.item_id)}
                        onChange={() => toggleItem(item.item_id)}
                        className="w-4 h-4 rounded border-input"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.brand} {item.model}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Settings Inputs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-starting-bid">Starting Bid</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="batch-starting-bid"
                      type="number"
                      value={settings.starting_bid}
                      onChange={(e) => setSettings({ ...settings, starting_bid: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-min-increment">Min Increment</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="batch-min-increment"
                      type="number"
                      value={settings.min_increment}
                      onChange={(e) => setSettings({ ...settings, min_increment: e.target.value })}
                      placeholder="1.00"
                      min="0"
                      step="0.01"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-buy-now">Buy Now Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="batch-buy-now"
                      type="number"
                      value={settings.buy_now_price}
                      onChange={(e) => setSettings({ ...settings, buy_now_price: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}

              {/* Apply Button */}
              <Button
                onClick={handleBatchUpdate}
                disabled={loading || selectedItems.length === 0}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Apply to {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================
// ITEMS TABLE WITH INDIVIDUAL SETTINGS
// ============================================
function ItemsTable({ items, onUpdate, auctionStatus, isDemo = false }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editSettings, setEditSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [togglingItem, setTogglingItem] = useState(null);

  const startEditing = (item) => {
    setEditingItem(item.item_id);
    setEditSettings({
      // Use suggested_starting_price if no starting_bid is set
      starting_bid: item.starting_bid || item.suggested_starting_price || '',
      min_increment: item.min_increment || '',
      buy_now_price: item.buy_now_price || '',
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditSettings({});
  };

  const saveItemSettings = async (itemId) => {
    setLoading(true);
    try {
      const updateData = {};
      if (editSettings.starting_bid !== '') updateData.starting_bid = parseFloat(editSettings.starting_bid);
      if (editSettings.min_increment !== '') updateData.min_increment = parseFloat(editSettings.min_increment);
      if (editSettings.buy_now_price !== '') updateData.buy_now_price = parseFloat(editSettings.buy_now_price);

      await updateItemAuctionSettings(itemId, updateData);
      setEditingItem(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleListing = async (itemId, currentStatus) => {
    setTogglingItem(itemId);
    try {
      await updateItemAuctionSettings(itemId, { is_listed: !currentStatus });
      onUpdate();
    } catch (err) {
      console.error('Failed to toggle listing:', err);
    } finally {
      setTogglingItem(null);
    }
  };

  // Separate items into listed and unlisted
  const listedItems = items.filter(item => item.is_listed);
  const unlistedItems = items.filter(item => !item.is_listed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Item Settings
        </CardTitle>
        <CardDescription>
          Configure pricing and listing status for items. Unlisted items won't appear on the public auction page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unlisted Items Section */}
        {unlistedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Unlisted Items ({unlistedItems.length}) - Not visible on public auction
            </h3>
            <div className="rounded-md border border-orange-200 bg-orange-50/50 overflow-hidden">
              <table className="w-full table-fixed">
                <thead className="bg-orange-100/50">
                  <tr>
                    <th className={`text-left px-4 py-3 text-sm font-medium ${isDemo ? 'w-[70%]' : 'w-[40%]'}`}>Item</th>
                    {!isDemo && (
                      <>
                        <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Starting Bid</th>
                        <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Min Increment</th>
                        <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Buy Now</th>
                      </>
                    )}
                    <th className={`text-center px-4 py-3 text-sm font-medium ${isDemo ? 'w-[30%]' : 'w-[15%]'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-200">
                  {unlistedItems.map((item) => (
                    <tr key={item.item_id} className="hover:bg-orange-100/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.images?.[0]?.url && (
                            <img
                              src={item.images[0].url}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.brand} {item.model}</p>
                            {!isDemo && item.suggested_starting_price && !item.starting_bid && (
                              <p className="text-xs text-blue-600">Suggested: ${item.suggested_starting_price.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {!isDemo && (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              {editingItem === item.item_id ? (
                                <Input
                                  type="number"
                                  value={editSettings.starting_bid}
                                  onChange={(e) => setEditSettings({ ...editSettings, starting_bid: e.target.value })}
                                  className="w-24 text-right"
                                  placeholder="0.00"
                                />
                              ) : (
                                <span className="w-24 text-right inline-block">{item.starting_bid ? `$${item.starting_bid.toLocaleString()}` : '-'}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              {editingItem === item.item_id ? (
                                <Input
                                  type="number"
                                  value={editSettings.min_increment}
                                  onChange={(e) => setEditSettings({ ...editSettings, min_increment: e.target.value })}
                                  className="w-24 text-right"
                                  placeholder="1.00"
                                />
                              ) : (
                                <span className="w-24 text-right inline-block">{item.min_increment ? `$${item.min_increment.toLocaleString()}` : '-'}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              {editingItem === item.item_id ? (
                                <Input
                                  type="number"
                                  value={editSettings.buy_now_price}
                                  onChange={(e) => setEditSettings({ ...editSettings, buy_now_price: e.target.value })}
                                  className="w-24 text-right"
                                  placeholder="0.00"
                                />
                              ) : (
                                <span className="w-24 text-right inline-block">{item.buy_now_price ? `$${item.buy_now_price.toLocaleString()}` : '-'}</span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingItem === item.item_id ? (
                            <>
                              <Button
                                size="icon"
                                variant="default"
                                onClick={() => saveItemSettings(item.item_id)}
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!isDemo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(item)}
                                >
                                  Edit
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => toggleListing(item.item_id, item.is_listed)}
                                disabled={togglingItem === item.item_id}
                              >
                                {togglingItem === item.item_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'List Item'
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listed Items Section */}
        <div>
          {listedItems.length > 0 && (
            <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Listed Items ({listedItems.length}) - Visible on public auction
            </h3>
          )}
          <div className="rounded-md border overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className={`text-left px-4 py-3 text-sm font-medium ${isDemo ? 'w-[70%]' : 'w-[40%]'}`}>Item</th>
                  {!isDemo && (
                    <>
                      <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Starting Bid</th>
                      <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Min Increment</th>
                      <th className="text-right px-4 py-3 text-sm font-medium w-[15%]">Buy Now</th>
                    </>
                  )}
                  <th className={`text-center px-4 py-3 text-sm font-medium ${isDemo ? 'w-[30%]' : 'w-[15%]'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listedItems.map((item) => (
                  <tr key={item.item_id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.images?.[0]?.url && (
                          <img
                            src={item.images[0].url}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.brand} {item.model}</p>
                        </div>
                      </div>
                    </td>
                    {!isDemo && (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {editingItem === item.item_id ? (
                              <Input
                                type="number"
                                value={editSettings.starting_bid}
                                onChange={(e) => setEditSettings({ ...editSettings, starting_bid: e.target.value })}
                                className="w-24 text-right"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="w-24 text-right inline-block">{item.starting_bid ? `$${item.starting_bid.toLocaleString()}` : '-'}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {editingItem === item.item_id ? (
                              <Input
                                type="number"
                                value={editSettings.min_increment}
                                onChange={(e) => setEditSettings({ ...editSettings, min_increment: e.target.value })}
                                className="w-24 text-right"
                                placeholder="1.00"
                              />
                            ) : (
                              <span className="w-24 text-right inline-block">{item.min_increment ? `$${item.min_increment.toLocaleString()}` : '-'}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {editingItem === item.item_id ? (
                              <Input
                                type="number"
                                value={editSettings.buy_now_price}
                                onChange={(e) => setEditSettings({ ...editSettings, buy_now_price: e.target.value })}
                                className="w-24 text-right"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="w-24 text-right inline-block">{item.buy_now_price ? `$${item.buy_now_price.toLocaleString()}` : '-'}</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {editingItem === item.item_id ? (
                          <>
                            <Button
                              size="icon"
                              variant="default"
                              onClick={() => saveItemSettings(item.item_id)}
                              disabled={loading}
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {!isDemo && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(item)}
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleListing(item.item_id, item.is_listed)}
                              disabled={togglingItem === item.item_id}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              {togglingItem === item.item_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Unlist'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {listedItems.length === 0 && (
                  <tr>
                    <td colSpan={isDemo ? 2 : 5} className="px-4 py-8 text-center text-muted-foreground">
                      No listed items yet. Use the "List Item" button above to make items visible on the public auction.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {items.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No items in this auction yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN SELLER AUCTION SETTINGS PAGE
// ============================================
export function SellerAuctionSettings() {
  const { auctionId } = useParams();
  const [auction, setAuction] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [auctionData, itemsData] = await Promise.all([
        getAuction(auctionId),
        listItems(auctionId)
      ]);
      setAuction(auctionData);
      setItems(itemsData.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePublish = async () => {
    setError('');
    setSuccessMessage('');
    
    // Validate that there are items
    if (items.length === 0) {
      setError('You need to add at least one item before publishing.');
      return;
    }
    
    // Check if any items are listed
    const listedItems = items.filter(item => item.is_listed);
    if (listedItems.length === 0) {
      setError('You need to list at least one item before publishing. Use the "List Item" button below to make items visible on your auction.');
      return;
    }
    
    // Check if listed items have pricing configured (skip for demo mode)
    if (!auction?.is_demo) {
      const itemsWithoutPricing = listedItems.filter(item => !item.starting_bid || item.starting_bid <= 0);
      if (itemsWithoutPricing.length > 0) {
        setError(`${itemsWithoutPricing.length} listed item(s) don't have pricing set. Please configure the starting bid for all listed items before publishing.`);
        return;
      }
    }
    
    setActionLoading('publish');
    try {
      await publishAuction(auctionId);
      setSuccessMessage('Auction published successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to publish auction');
    } finally {
      setActionLoading('');
    }
  };

  const handleClose = async () => {
    setActionLoading('close');
    setError('');
    setSuccessMessage('');
    try {
      await closeAuction(auctionId);
      setSuccessMessage('Auction closed successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to close auction');
    } finally {
      setActionLoading('');
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

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auction/${auctionId}/public`);
    setSuccessMessage('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{auction?.auction_name}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            Auction Settings • {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Back to Auction */}
          <Link to={`/auction/${auctionId}`}>
            <Button variant="outline">
              Back to Auction
            </Button>
          </Link>

          {/* Track Bids - only when published */}
          {auction?.status === 'published' && (
            <Link to={`/auction/${auctionId}/bids`}>
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Track Bids
              </Button>
            </Link>
          )}
          
          {/* Preview Button - only show in draft */}
          {auction?.status === 'draft' && (
            <Link to={`/auction/${auctionId}/public`} target="_blank">
              <Button variant="outline" size="icon" title="Preview Public Auction">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {/* View Live - only when published */}
          {auction?.status === 'published' && (
            <Link to={`/auction/${auctionId}/public`} target="_blank">
              <Button variant="outline" size="icon" title="View Live Auction">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {/* Publish/Close Buttons */}
          {auction?.status === 'draft' && (
            <Button onClick={handlePublish} disabled={actionLoading === 'publish'}>
              {actionLoading === 'publish' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish Auction
            </Button>
          )}
          {auction?.status === 'published' && (
            <Button variant="destructive" onClick={handleClose} disabled={actionLoading === 'close'}>
              {actionLoading === 'close' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Close Auction
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Share Link - Always visible when published */}
      {auction?.status === 'published' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-blue-800 mb-2">Share your auction:</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/auction/${auctionId}/public`}
                className="bg-white"
              />
              <Button onClick={copyShareLink} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auction Settings */}
      <AuctionSettingsForm auction={auction} onUpdate={fetchData} />

      {/* Batch Item Settings */}
      <BatchItemSettingsForm items={items} onUpdate={fetchData} />

      {/* Items Table */}
      <ItemsTable items={items} onUpdate={fetchData} auctionStatus={auction?.status} isDemo={auction?.is_demo} />
    </div>
  );
}

export default SellerAuctionSettings;
