import { useState } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Shield, Eye, EyeOff, Mail, Lock, Github, Loader2 } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { toast } from "sonner";
import axios from "axios"; // <--- ADDED: Necessary for direct API call
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function LoginPage() {
  const { login } = useAuth(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [devResetLink, setDevResetLink] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // 1. Direct Backend Call to capture the Token
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: loginData.email,
        password: loginData.password,
      });

      // 2. Extract Token
      const { access_token } = response.data;

      if (!access_token) {
        throw new Error("No access token received.");
      }

      // 3. CRITICAL: Save Token to Storage (Fixes Settings Page issue)
      localStorage.setItem("access_token", access_token);
      
      // 4. Update Context State
      await login(loginData.email, loginData.password);
      
      toast.success("Welcome back!");
      navigate("/dashboard"); 

    } catch (err: any) {
      console.error("Login Error:", err);
      const msg = err.response?.data?.detail || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // FIX: Use axios directly to hit the correct backend route
      await axios.post(`${API_URL}/auth/register`, {
        email: registerData.email,
        password: registerData.password,
        full_name: registerData.name // Backend expects 'full_name', not 'name'
      });
      
      toast.success("Account created! Please sign in.");
      
      // Switch the tab to "Sign In" automatically
      const loginTab = document.querySelector('[value="login"]') as HTMLElement;
      if (loginTab) loginTab.click();
      
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error("Please enter your registered email");
      return;
    }

    setForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotEmail });
      const fallbackLink = response.data?.dev_reset_link;

      if (fallbackLink) {
        setDevResetLink(fallbackLink);
        toast.info("Email service is not configured. Use the dev reset link below.");
      } else {
        setDevResetLink("");
        toast.success("If your email is registered, a reset link has been sent.");
        setForgotPasswordOpen(false);
        setForgotEmail("");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to send reset email";
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-xl border border-zinc-700/60 bg-zinc-800">
                <Shield className="w-8 h-8 text-zinc-100" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">FairVision</h1>
            </div>
            <p className="text-zinc-400">
              Advanced AI fairness platform for bias detection and mitigation
            </p>
          </div>

          {/* Auth Card */}
          <Card className="glass-card rounded-2xl shadow-xl border-zinc-800">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-zinc-100">Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 glass-plate p-1 rounded-lg bg-zinc-900">
                  <TabsTrigger
                    value="login"
                    className="rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 transition-colors"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 transition-colors"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Social auth (placeholder) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  <Button
                    type="button"
                    onClick={() => toast.info("Google sign-in coming soon")}
                    className="w-full border border-zinc-700/60 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800/70"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Google
                  </Button>
                  <Button
                    type="button"
                    onClick={() => toast.info("GitHub sign-in coming soon")}
                    className="w-full border border-zinc-700/60 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800/70"
                  >
                    <Github className="w-4 h-4 mr-2" /> GitHub
                  </Button>
                </div>
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <span className="w-full border-t border-zinc-700/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 pt-1 text-zinc-500">or continue with</span>
                  </div>
                </div>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-9"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Your password"
                          className="pl-9 pr-10"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8 text-zinc-500"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="inline-flex items-center gap-2 text-zinc-400 select-none">
                        <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-sky-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Ada Lovelace"
                        value={registerData.name}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@company.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Confirm Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-zinc-500 mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>

          <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
            <DialogContent className="bg-zinc-950 border-zinc-700 text-zinc-100 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Reset your password</DialogTitle>
                <DialogDescription className="text-zinc-300">
                  Enter your registered email address. We will send a password reset link.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-zinc-200">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-400"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              {devResetLink ? (
                <div className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3 text-xs text-zinc-700 dark:text-zinc-300 space-y-2">
                  <p>Email was not sent from backend. Use this development reset link:</p>
                  <a href={devResetLink} className="break-all text-sky-600 dark:text-sky-400 hover:underline">
                    {devResetLink}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(devResetLink);
                      toast.success("Reset link copied");
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setDevResetLink("");
                  }}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleForgotPassword} disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send reset link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}