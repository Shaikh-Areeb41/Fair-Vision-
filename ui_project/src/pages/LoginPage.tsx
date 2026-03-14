import { useState } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Eye, EyeOff, Mail, Lock, Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios"; // <--- ADDED: Necessary for direct API call
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function LoginPage() {
  const passwordComplexityMessage = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  });

  const registerSchema = z
    .object({
      name: z
        .string()
        .trim()
        .min(3, "Full name must be at least 3 characters")
        .max(50, "Full name cannot exceed 50 characters")
        .regex(/^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
      email: z.string().email("Invalid email format"),
      password: z.string().regex(passwordRegex, passwordComplexityMessage),
      confirmPassword: z.string().min(1, "Confirm password is required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords must match",
    });

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
  const [registerTouched, setRegisterTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [submittedLogin, setSubmittedLogin] = useState(false);
  const [submittedRegister, setSubmittedRegister] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const loginValidation = loginSchema.safeParse(loginData);
  const loginErrors = loginValidation.success ? {} : loginValidation.error.flatten().fieldErrors;
  const registerValidation = registerSchema.safeParse(registerData);
  const registerErrors = registerValidation.success ? {} : registerValidation.error.flatten().fieldErrors;
  const isRegisterValid = registerValidation.success;

  const showRegisterFieldError = (field: keyof typeof registerTouched) => {
    return (submittedRegister || registerTouched[field]) && !!registerErrors[field]?.[0];
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    if (!API_URL) {
      toast.error("API URL is not configured");
      return;
    }
    window.location.href = `${API_URL}/auth/${provider}/login`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedLogin(true);

    if (!loginValidation.success) {
      toast.error("Please correct the highlighted fields");
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

      navigate("/dashboard"); 

    } catch (err: any) {
      console.error("Login Error:", err);
      toast.error(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };
const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedRegister(true);

    if (!registerValidation.success) {
      toast.error("Please correct the highlighted fields");
      return;
    }

    setLoading(true);
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        email: registerData.email,
        password: registerData.password,
        full_name: registerData.name,
      });

      toast.success("Account created. Enter verification code sent to your email.");
      navigate(`/verify-email?email=${encodeURIComponent(registerData.email)}`);

      const devCode = registerResponse.data?.dev_verification_code;
      if (devCode) {
        toast.info(`Dev verification code: ${devCode}`);
      }
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
      const savedTheme = localStorage.getItem("theme");
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: forgotEmail,
        theme: savedTheme,
      });
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">

      <div className="relative z-10 flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/FairVisionlogo.png" alt="FairVision logo" className="h-12 w-12 object-contain" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">FairVision</h1>
            </div>
            <p className="text-muted-foreground">
              Advanced AI fairness platform for bias detection and mitigation
            </p>
          </div>

          {/* Auth Card */}
          <Card className="glass-card rounded-2xl shadow-xl border-border">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-foreground">Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="login"
                    className="rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:text-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:text-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Social auth (placeholder) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  <Button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    className="w-full border border-border bg-card text-foreground hover:bg-muted"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Google
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSocialLogin("github")}
                    className="w-full border border-border bg-card text-foreground hover:bg-muted"
                  >
                    <Github className="w-4 h-4 mr-2" /> GitHub
                  </Button>
                </div>
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 pt-1 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          required
                          placeholder="you@company.com"
                          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                      {submittedLogin && loginErrors.email?.[0] ? (
                        <p className="text-xs font-medium fv-error-text">{loginErrors.email[0]}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Your password"
                          className="pl-9 pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {submittedLogin && loginErrors.password?.[0] ? (
                        <p className="text-xs font-medium fv-error-text">{loginErrors.password[0]}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="inline-flex items-center gap-2 text-muted-foreground select-none">
                        <input type="checkbox" className="h-4 w-4 rounded border-border" />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-foreground">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        required
                        placeholder="Ada Lovelace"
                        className={`bg-card text-foreground placeholder:text-muted-foreground ${
                          showRegisterFieldError("name") ? "border-destructive focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.25)]" : "border-border"
                        }`}
                        value={registerData.name}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, name: e.target.value }))}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, name: true }))}
                        aria-invalid={showRegisterFieldError("name")}
                      />
                      {showRegisterFieldError("name") ? (
                        <p className="text-xs font-medium fv-error-text">{registerErrors.name[0]}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-foreground">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        required
                        placeholder="you@company.com"
                        className={`bg-card text-foreground placeholder:text-muted-foreground ${
                          showRegisterFieldError("email") ? "border-destructive focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.25)]" : "border-border"
                        }`}
                        value={registerData.email}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, email: true }))}
                        aria-invalid={showRegisterFieldError("email")}
                      />
                      {showRegisterFieldError("email") ? (
                        <p className="text-xs font-medium fv-error-text">{registerErrors.email[0]}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-foreground">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        required
                        placeholder="Create a password"
                        className={`bg-card text-foreground placeholder:text-muted-foreground ${
                          showRegisterFieldError("password") ? "border-destructive focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.25)]" : "border-border"
                        }`}
                        value={registerData.password}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, password: true }))}
                        aria-invalid={showRegisterFieldError("password")}
                      />
                      <p
                        className={`text-xs ${
                          showRegisterFieldError("password")
                            ? "font-medium fv-error-text"
                            : "text-muted-foreground"
                        }`}
                      >
                        {passwordComplexityMessage}
                      </p>
                      {showRegisterFieldError("password") ? (
                        <p className="text-xs font-medium fv-error-text">{registerErrors.password[0]}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="text-foreground">Confirm Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        required
                        placeholder="Confirm your password"
                        className={`bg-card text-foreground placeholder:text-muted-foreground ${
                          showRegisterFieldError("confirmPassword") ? "border-destructive focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.25)]" : "border-border"
                        }`}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        onBlur={() => setRegisterTouched((prev) => ({ ...prev, confirmPassword: true }))}
                        aria-invalid={showRegisterFieldError("confirmPassword")}
                      />
                      {showRegisterFieldError("confirmPassword") ? (
                        <p className="text-xs font-medium fv-error-text">{registerErrors.confirmPassword[0]}</p>
                      ) : null}
                    </div>

                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={loading || !isRegisterValid}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>

          <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
            <DialogContent className="bg-card border-border text-foreground shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">Reset your password</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enter your registered email address. We will send a password reset link.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-foreground">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              {devResetLink ? (
                <div className="rounded-md border border-border p-3 text-xs text-muted-foreground space-y-2">
                  <p>Email was not sent from backend. Use this development reset link:</p>
                  <a href={devResetLink} className="break-all text-primary hover:underline">
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