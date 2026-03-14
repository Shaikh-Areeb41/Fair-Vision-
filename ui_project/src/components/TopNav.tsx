import { Link, useLocation } from "react-router-dom";
import { Cog, ChevronDown, Menu, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAuth } from "../context/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type TopNavProps = {
  userName: string;
};

const navItems = [
  { to: "/dashboard", label: "Oversight Dashboard" },
  { to: "/audit-intelligence", label: "Intelligence Dashboard" },
  { to: "/history", label: "Audit Logs" },            
  { to: "/upload", label: "New Audit" },              
  { to: "/reports", label: "Governance Report" },    
  { to: "/mitigation", label: "Fairness Simulator" }, 
];

export function TopNav({ userName }: TopNavProps) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const profileImage = user?.profile_image;
  const isAdminTestUser = Boolean(user?.is_admin);
  const navItemsToRender = isAdminTestUser
    ? [...navItems, { to: "/admin-test", label: "Admin Test" }]
    : navItems;

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8 pt-4">
        <div className="fv-topnav-glass">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5">
            {/* Brand */}
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-[170px]">
              <div className="flex items-center justify-center">
                <img src="/FairVisionlogo.png" alt="FairVision logo" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-foreground font-semibold tracking-tight text-lg">
                FairVision
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden lg:flex items-center justify-center gap-1 flex-1 px-4">
              {navItemsToRender.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}>
                    <Button
                      variant={active ? "outline" : "ghost"}
                      size="sm"
                      className={`rounded-xl px-4 transition-all duration-300 ${
                        active 
                          ? "bg-background/30 border-border text-foreground shadow-soft-sm" 
                          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 max-w-[45%] justify-end">
              
              {/* --- MOBILE MENU --- */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[340px] border-r border-border/40 bg-background/95 backdrop-blur-xl">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <div className="flex items-center justify-center">
                          <img src="/FairVisionlogo.png" alt="FairVision logo" className="w-7 h-7 object-contain" />
                        </div>
                        <span>FairVision</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex flex-col gap-1">
                      {navItemsToRender.map((item) => {
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
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs border-0">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium truncate flex-1">{userName}</div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={logout} 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* USER DROPDOWN MENU */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="pl-1.5 pr-2 max-w-full focus-visible:ring-0 hover:bg-secondary/40 rounded-xl transition-all">
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profileImage || undefined} alt={userName} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold border-0">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block max-w-[130px] md:max-w-[180px] truncate text-sm font-medium text-foreground/80">
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
                  className="w-56 mt-2 rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-1.5"
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
                    className="group rounded-lg cursor-pointer mt-1 text-destructive/80 focus:text-destructive focus:bg-destructive/10 transition-all duration-200"
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