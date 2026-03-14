import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const oauthError = searchParams.get("oauth_error");
    if (oauthError) {
      toast.error(oauthError);
      navigate("/login", { replace: true });
      return;
    }

    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const fullName = searchParams.get("full_name");
    const profileImage = searchParams.get("profile_image");

    if (!token || !email) {
      toast.error("OAuth login failed. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    loginWithToken(token, {
      email,
      full_name: fullName || email,
      profile_image: profileImage || null,
    });

    toast.success("Signed in successfully");
    navigate("/dashboard", { replace: true });
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center text-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
        <p>Finalizing secure sign-in...</p>
      </div>
    </div>
  );
}
