import { Link, useLocation } from "react-router-dom";
import { Bell, Cog, Shield, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";

type TopNavProps = {
  userName: string;
};

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/reports", label: "Bias Reports" },
  { to: "/upload", label: "Datasets" },
  { to: "/analysis", label: "Models" },
  { to: "/mitigation", label: "Mitigation" },
];

export function TopNav({ userName }: TopNavProps) {
  const { pathname } = useLocation();

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass-panel dark:shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            {/* Brand */}
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl border border-border bg-secondary">
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
                      className="rounded-xl"
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Link to="/settings">
                <Button variant="ghost" size="icon" aria-label="Settings">
                  <Cog className="w-5 h-5" />
                </Button>
              </Link>

              <Button variant="ghost" size="sm" className="pl-1.5 pr-2">
                <span className="inline-flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-secondary text-foreground border border-border">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium">
                    {userName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
