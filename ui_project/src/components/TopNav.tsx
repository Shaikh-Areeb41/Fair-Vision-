import { Link, useLocation } from "react-router-dom";
import { Bell, Cog, Shield, ChevronDown, Menu, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAuth } from "../context/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type TopNavProps = {
  userName: string;
};

const navItems = [
  { to: "/dashboard", label: "Oversight Dashboard" },
  { to: "/history", label: "Audit Logs" },            
  { to: "/upload", label: "New Audit" },              
  { to: "/reports", label: "Compliance Reports" },    
  { to: "/mitigation", label: "Fairness Simulator" }, 
];

export function TopNav({ userName }: TopNavProps) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const profileImage = user?.profile_image;

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-4">
        {/* Main Glass Navbar Panel */}
        <div className="glass-panel dark:shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5">
            {/* Brand */}
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl border border-border bg-secondary/50 backdrop-blur-sm">
                <Shield className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-foreground font-semibold tracking-tight">
                FairVision
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}>
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={`rounded-xl transition-all duration-300 ${
                        active 
                          ? "bg-secondary/80 shadow-sm" 
                          : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              
              {/* --- MOBILE MENU --- */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] border-r border-border/40 bg-background/80 backdrop-blur-xl">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-xl border border-border bg-secondary/50">
                          <Shield className="w-4 h-4 text-foreground" />
                        </div>
                        <span>FairVision</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex flex-col gap-1">
                      {navItems.map((item) => {
                        const active = pathname.startsWith(item.to);
                        return (
                          <Link key={item.to} to={item.to}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start rounded-lg ${active ? "bg-secondary/80 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}
                              size="sm"
                            >
                              {item.label}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-6 border-t border-border/40 pt-4 flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profileImage || undefined} alt={userName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs border-0">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium truncate flex-1">{userName}</div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={logout} 
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* --- DESKTOP ACTIONS --- */}
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-secondary/50 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="hover:bg-secondary/50 rounded-lg text-muted-foreground hover:text-foreground">
                  <Cog className="w-5 h-5" />
                </Button>
              </Link>

              {/* USER DROPDOWN MENU */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="pl-1.5 pr-2 focus-visible:ring-0 hover:bg-secondary/50 rounded-xl transition-all">
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profileImage || undefined} alt={userName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold border-0">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-foreground/80">
                        {userName}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                
                {/* UPDATED: Consistent Glass Styling 
                   Using bg-background/80 ensures it matches the app theme (dark/light) exactly.
                */}
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 mt-2 rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl p-1.5"
                >
                  <DropdownMenuSeparator className="bg-border/50" />
                  
                  <Link to="/settings">
                    <DropdownMenuItem className="rounded-lg cursor-pointer focus:bg-foreground/5 focus:text-foreground text-muted-foreground transition-colors duration-200">
                      <Cog className="w-4 h-4 mr-2" /> Settings
                    </DropdownMenuItem>
                  </Link>
                  
                  <DropdownMenuSeparator className="bg-border/50" />
                  
                  {/* Danger Glass Logout */}
                  <DropdownMenuItem 
                    onClick={logout} 
                    className="group rounded-lg cursor-pointer mt-1 text-red-600/80 dark:text-red-400/80 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-500/10 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2 opacity-70 group-hover:opacity-100 transition-opacity" /> 
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}