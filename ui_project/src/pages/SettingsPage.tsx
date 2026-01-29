import { useState } from "react";
import axios from "axios"; // <--- ADDED MISSING IMPORT
import { useAuth } from "../context/AuthContext";
import { useTheme } from "next-themes"; 
import { 
  User, 
  Mail, 
  Shield, 
  Moon, 
  Sun, 
  LogOut, 
  Lock,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { toast } from "sonner";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { setTheme, theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");
  const [isLoading, setIsLoading] = useState(false);

  // States for form inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- ADDED MISSING INITIALS LOGIC ---
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

 const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
    }
    if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
    }

    setIsLoading(true);

    try {
        // 1. Get Token & CLEAN IT (Remove quotes if they exist)
        let token = localStorage.getItem("access_token") || localStorage.getItem("token");
        
        if (!token) {
            toast.error("No session found. Please log in again.");
            return;
        }
        
        // Remove extra quotes if present (Common bug)
        token = token.replace(/^"|"$/g, '');

        // 2. Call Backend
            
        const API_URL = import.meta.env.VITE_API_URL; 
        const response = await axios.post(
            `${API_URL}/auth/change-password`,
            {
                current_password: currentPassword,
                new_password: newPassword
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        // 3. Success
        if (response.status === 200) {
            toast.success("Password updated! Please log in with your new password.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            // Optional: Logout ONLY on success to force re-auth
            // logout(); 
        }

    } catch (error: any) {
        console.error("Password update failed:", error);
        
        // 4. IMPROVED ERROR HANDLING (No Auto-Logout)
        if (error.response) {
            // Server responded with a status code (4xx, 5xx)
            if (error.response.status === 401) {
                toast.error("Unauthorized: Your session may be invalid. Try logging out and back in.");
            } else {
                toast.error(error.response.data.detail || "Failed to update password.");
            }
        } else if (error.request) {
            // Request made but no response
            toast.error("Server not responding. Is the backend running?");
        } else {
            toast.error("An unexpected error occurred.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and secure workspace settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        
        {/* Sidebar / Quick Nav */}
        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Button 
            variant={activeTab === "general" ? "secondary" : "ghost"} 
            className={`justify-start font-medium ${activeTab === "general" ? "text-foreground" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            <User className="mr-2 h-4 w-4" /> General
          </Button>
          
          <Button 
            variant={activeTab === "security" ? "secondary" : "ghost"} 
            className={`justify-start font-medium ${activeTab === "security" ? "text-foreground" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <Lock className="mr-2 h-4 w-4" /> Security
          </Button>

          <div className="my-2 border-t border-border/50" />

          <Button 
            variant="ghost" 
            className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10" 
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </nav>

        {/* Main Content Area */}
        <div className="space-y-6">
          
          {/* --- GENERAL TAB --- */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                {/* Profile Card */}
                <Card className="glass-card">
                    <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your personal identification details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarFallback className="text-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            {initials}
                        </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                        <h3 className="font-medium leading-none text-lg">{user?.full_name || "User"}</h3>
                        <p className="text-sm text-muted-foreground">Full Access Administrator</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Full Name</label>
                        <div className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-70">
                            <User className="mr-2 h-4 w-4 opacity-50" />
                            {user?.full_name}
                        </div>
                        </div>
                        <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Email Address</label>
                        <div className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-70">
                            <Mail className="mr-2 h-4 w-4 opacity-50" />
                            {user?.email}
                        </div>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                {/* Appearance Card */}
                <Card className="glass-card">
                    <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how FairVision looks on your device.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="space-y-0.5">
                        <div className="text-base font-medium">Interface Theme</div>
                        <p className="text-sm text-muted-foreground">
                            Select your preferred color scheme.
                        </p>
                        </div>
                        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg border border-border">
                        <Button 
                            variant={theme === "light" ? "default" : "ghost"} 
                            size="sm" 
                            onClick={() => setTheme("light")}
                            className="h-8 w-8 p-0 rounded-md"
                        >
                            <Sun className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={theme === "dark" ? "default" : "ghost"} 
                            size="sm" 
                            onClick={() => setTheme("dark")}
                            className="h-8 w-8 p-0 rounded-md"
                        >
                            <Moon className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                {/* Organization Card */}
                <Card className="glass-card">
                    <CardHeader>
                    <CardTitle>Organization</CardTitle>
                    <CardDescription>Workspace and role management.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="flex items-center gap-4 p-4 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">FairVision Audit License</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Active • Enterprise Plan</p>
                        </div>
                    </div>
                    </CardContent>
                </Card>
            </div>
          )}

          {/* --- SECURITY TAB --- */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Password & Security</CardTitle>
                        <CardDescription>Manage your password and account security settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="current">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input 
                                      type="password"
                                      id="current"
                                      value={currentPassword} 
                                      onChange={(e) => setCurrentPassword(e.target.value)} 
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      placeholder="Enter current password"
                                      required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="new">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input 
                                      type="password"
                                      id="new"
                                      value={newPassword} 
                                      onChange={(e) => setNewPassword(e.target.value)} 
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      placeholder="Enter new password"
                                      required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="confirm">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input 
                                      type="password"
                                      id="confirm"
                                      value={confirmPassword} 
                                      onChange={(e) => setConfirmPassword(e.target.value)} 
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      placeholder="Confirm new password"
                                      required
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={isLoading} className="bg-zinc-900 text-white hover:bg-zinc-800">
                                    {isLoading ? "Updating..." : "Update Password"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}