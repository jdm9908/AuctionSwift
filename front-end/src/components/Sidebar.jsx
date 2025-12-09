import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Gavel, ChevronLeft, ChevronRight, ChevronDown, CreditCard, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useAuction } from '../context/AuctionContext';
import { cn } from '../lib/utils';
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";



export function Sidebar({ onSearchClick, onPlanClick, onSettingsClick, onHelpClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleLogout = async () => {
    try {
      // 1. Sign out the user from Supabase
      await supabase.auth.signOut();

      // 2. Close the dropdown menu
      setShowProfileMenu(false);

      // 3. Navigate back to homepage
      navigate("/");

    } catch (err) {
      console.error("Error logging out:", err.message);
    }
  };
  const { state } = useAuction();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    draft: true,
    live: true,
    closed: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter auctions by status
  const draftAuctions = [...state.auctions]
    .filter(a => !a.status || a.status === 'draft')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const liveAuctions = [...state.auctions]
    .filter(a => a.status === 'published')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const closedAuctions = [...state.auctions]
    .filter(a => a.status === 'closed')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <aside className={cn(
      "border-r bg-card h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* App Name and Collapse Button */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Gavel className="h-6 w-6" />
              <span>EstateBid</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <Link to="/" className="flex items-center justify-center">
              <Gavel className="h-6 w-6" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Primary Actions */}
      <div className="px-2 py-2">
        {isCollapsed ? (
          <>
            <Button asChild size="icon" variant="ghost" className="w-full" title="New Auction">
              <Link to="/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-full" 
              title="Search Auctions"
              onClick={onSearchClick}
            >
              <Search className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Link 
              to="/new" 
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors rounded-md"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Auction
            </Link>

            <button 
              onClick={onSearchClick}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors rounded-md text-left"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Search Auctions
            </button>
          </>
        )}
      </div>

      <Separator />

      {/* Auction List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-2 pt-2">
            <div className="space-y-2 pb-4">
              {state.auctions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No auctions yet
                </div>
              ) : (
                <>
                  {/* Draft Section */}
                  {draftAuctions.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('draft')}
                        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          Draft ({draftAuctions.length})
                        </span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", !expandedSections.draft && "-rotate-90")} />
                      </button>
                      {expandedSections.draft && (
                        <div className="space-y-1 mt-1">
                          {draftAuctions.map(auction => (
                            <Link key={auction.auction_id} to={`/auction/${auction.auction_id}`}>
                              <div className={cn(
                                "px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors cursor-pointer",
                                location.pathname.startsWith(`/auction/${auction.auction_id}`) && "bg-accent"
                              )}>
                                <div className="font-medium truncate">{auction.auction_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(auction.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Section */}
                  {liveAuctions.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('live')}
                        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Live ({liveAuctions.length})
                        </span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", !expandedSections.live && "-rotate-90")} />
                      </button>
                      {expandedSections.live && (
                        <div className="space-y-1 mt-1">
                          {liveAuctions.map(auction => (
                            <Link key={auction.auction_id} to={`/auction/${auction.auction_id}`}>
                              <div className={cn(
                                "px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors cursor-pointer",
                                location.pathname.startsWith(`/auction/${auction.auction_id}`) && "bg-accent"
                              )}>
                                <div className="font-medium truncate">{auction.auction_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(auction.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Closed Section */}
                  {closedAuctions.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('closed')}
                        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Closed ({closedAuctions.length})
                        </span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", !expandedSections.closed && "-rotate-90")} />
                      </button>
                      {expandedSections.closed && (
                        <div className="space-y-1 mt-1">
                          {closedAuctions.map(auction => (
                            <Link key={auction.auction_id} to={`/auction/${auction.auction_id}`}>
                              <div className={cn(
                                "px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors cursor-pointer opacity-60",
                                location.pathname.startsWith(`/auction/${auction.auction_id}`) && "bg-accent opacity-100"
                              )}>
                                <div className="font-medium truncate">{auction.auction_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(auction.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Profile Section */}
      <div className="border-t mt-auto relative">
        {!isCollapsed ? (
          <>
            <div 
              className="p-3 flex items-center gap-3 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
            {/* Avatar with initials */}
            <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-blue-900">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name
                      .split(" ")
                      .map(word => word[0])
                      .join("")
                      .toUpperCase()
                  : "U"}
              </span>
            </div>

            {/* Name + Email */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || "Unknown User"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email || "no-email"}
              </div>
            </div>

          </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border rounded-lg shadow-lg overflow-hidden">
                <button
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-sm"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onPlanClick();
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Plan</span>
                </button>
                <button
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-sm"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSettingsClick();
                  }}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                <button
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-sm"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onHelpClick();
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Help</span>
                </button>
                <Separator />
                <button
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-sm text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div 
            className="p-3 flex justify-center cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-900">JD</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
