import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { Separator } from "./ui/separator";
import {
  LayoutDashboard,
  Upload,
  Brain,
  BarChart3,
  Shield,
  FileText,
  Settings,
  LogOut,
  Plus,
  User,
} from "lucide-react";

interface SidebarProps {
  onLogout: () => void;
  userName: string;
  completedProjects: number;
}

export function Sidebar({
  onLogout,
  userName,
  completedProjects,
}: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname.split("/")[1] || "dashboard";

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "upload",
      label: "Upload Model",
      icon: Upload,
      badge: null,
    },
    {
      id: "train",
      label: "Train Model",
      icon: Brain,
      badge: null,
    },
    {
      id: "analysis",
      label: "Bias Analysis",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "mitigation",
      label: "Mitigation",
      icon: Shield,
      badge: null,
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      badge: completedProjects > 0 ? completedProjects.toString() : null,
    },
  ];

  return (
    <div className="w-64 h-full flex flex-col bg-background border-r border-border">
      {/* Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary border border-border">
              <Shield className="w-5 h-5 text-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">FairVision</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <User className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground">AI Fairness Analyst</p>
          </div>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Quick Action */}
      <div className="p-4">
        <Link to="/upload">
          <Button className="w-full" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </Link>
      </div>

      <Separator className="mx-4" />

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;

            return (
              <Link key={item.id} to={`/${item.id}`}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start rounded-lg transition-colors")}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-auto"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator className="mx-4" />

      {/* Bottom Actions */}
      <div className="p-3 space-y-1">
        <Link to="/settings">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-lg"
          >
            <Settings className="w-4 h-4 mr-3" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
