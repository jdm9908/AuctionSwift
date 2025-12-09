import { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

export function SettingsModal({ open, onOpenChange }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
            {/* Appearance Settings */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <CardTitle className="text-base">Appearance</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Customize how the app looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Dark Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Enable dark theme for better viewing in low light
                    </div>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
              </CardContent>
            </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
