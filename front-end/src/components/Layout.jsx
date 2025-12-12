// Main layout component - includes sidebar and modal controls
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SearchModal } from './SearchModal';
import { PlanModal } from './PlanModal';
import { SettingsModal } from './SettingsModal';
import { HelpModal } from './HelpModal';

export function Layout() {
  const navigate = useNavigate();
  // Track which modals are open
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar with navigation */}
      <Sidebar 
        onSearchClick={() => setIsSearchOpen(true)}
        onPlanClick={() => setIsPlanOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onHelpClick={() => setIsHelpOpen(true)}
        onDocsClick={() => navigate('/docs')}
      />
      
      {/* Main content area - pages render here */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
      
      {/* Modals - only show when opened */}
      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <PlanModal open={isPlanOpen} onOpenChange={setIsPlanOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
