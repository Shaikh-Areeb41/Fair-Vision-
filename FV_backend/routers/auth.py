from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel
from database import users_collection
from security import (
    verify_password,
    get_password_hash,
    SECRET_KEY,
    ALGORITHM,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
)
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from datetime import datetime, timedelta
import hashlib
import os
import resend
import secrets
from urllib.parse import urlencode
import httpx

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Setup for token verification
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- 1. MODELS ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _build_frontend_url(path: str = "/login") -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{frontend_url}{path}"


def _create_oauth_state(provider: str) -> str:
    payload = {
        "provider": provider,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=10),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _validate_oauth_state(state: str, provider: str) -> None:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if payload.get("provider") != provider:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")


def _redirect_with_error(message: str):
    target = f"{_build_frontend_url('/login')}?{urlencode({'oauth_error': message})}"
    return RedirectResponse(url=target)


async def _create_or_update_oauth_user(email: str, full_name: str, provider: str, profile_image: str | None = None):
    existing_user = await users_collection.find_one({"email": email})
    if existing_user:
        updates = {}
        if not existing_user.get("full_name") and full_name:
            updates["full_name"] = full_name
        if not existing_user.get("auth_provider"):
            updates["auth_provider"] = provider
        if profile_image:
            updates["profile_image"] = profile_image
        if updates:
            await users_collection.update_one({"_id": existing_user["_id"]}, {"$set": updates})
        return {
            "email": email,
            "full_name": existing_user.get("full_name") or full_name or email,
            "profile_image": updates.get("profile_image") or existing_user.get("profile_image"),
        }

    generated_password = secrets.token_urlsafe(32)
    user_doc = {
        "email": email,
        "full_name": full_name or email,
        "hashed_password": get_password_hash(generated_password),
        "auth_provider": provider,
        "profile_image": profile_image,
    }
    await users_collection.insert_one(user_doc)
    return {"email": email, "full_name": user_doc["full_name"], "profile_image": user_doc.get("profile_image")}


def send_reset_email(recipient_email: str, reset_link: str):
    api_key = os.getenv("RESEND_API_KEY")
    smtp_from = os.getenv("SMTP_FROM", "onboarding@resend.dev")

    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured in environment variables.")

    resend.api_key = api_key
    
    email_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>FairVision Password Reset</h2>
        <p>You requested a password reset for your FairVision account.</p>
        <p>
          <a href="{reset_link}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Your Password
          </a>
        </p>
        <p>Or copy this link: <a href="{reset_link}">{reset_link}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p><small>This link expires in 30 minutes.</small></p>
      </body>
    </html>
    """
    
    resend.Emails.send({
        "from": smtp_from,
        "to": recipient_email,
        "subject": "FairVision Password Reset",
        "html": email_body,
    })

# --- 2. HELPER: GET CURRENT USER ---
# This decodes the token to find out WHO is trying to change the password
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# --- 3. EXISTING ROUTES ---
@router.post("/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(user.password)
    user_dict = {
        "email": user.email, 
        "full_name": user.full_name, 
        "hashed_password": hashed_pw
    }
    result = await users_collection.insert_one(user_dict)
    return {"id": str(result.inserted_id), "email": user.email, "message": "User created"}

@router.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    hashed_password = db_user.get("hashed_password")
    if not hashed_password or not verify_password(user.password, hashed_password):
        provider = db_user.get("auth_provider")
        if provider in {"google", "github"}:
            raise HTTPException(
                status_code=401,
                detail=f"This account uses {provider.title()} sign-in. Please use the social login button.",
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.email, "full_name": db_user["full_name"]})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "full_name": db_user["full_name"],
            "profile_image": db_user.get("profile_image"),
        }
    }


@router.get("/google/login")
async def google_login():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    callback_url = os.getenv("GOOGLE_CALLBACK_URL")

    if not client_id or not callback_url:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    state = _create_oauth_state("google")
    params = {
        "client_id": client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "include_granted_scopes": "true",
        "prompt": "select_account",
    }

    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_url)


@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(...)):
    _validate_oauth_state(state, "google")

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    callback_url = os.getenv("GOOGLE_CALLBACK_URL")

    if not client_id or not client_secret or not callback_url:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code >= 400:
            return _redirect_with_error("Google sign-in failed")

        token_data = token_response.json()
        id_token = token_data.get("id_token")
        access_token = token_data.get("access_token")

        email = None
        full_name = None
        profile_image = None

        if id_token:
            try:
                claims = jwt.get_unverified_claims(id_token)
                email = claims.get("email")
                full_name = claims.get("name")
                profile_image = claims.get("picture")
            except Exception:
                email = None

        if not email and access_token:
            profile_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_response.status_code < 400:
                profile = profile_response.json()
                email = profile.get("email")
                full_name = profile.get("name")
                profile_image = profile.get("picture")

    if not email:
        return _redirect_with_error("Google account email not available")

    app_user = await _create_or_update_oauth_user(
        email=email,
        full_name=full_name or email,
        provider="google",
        profile_image=profile_image,
    )
    app_token = create_access_token(data={"sub": app_user["email"], "full_name": app_user["full_name"]})

    redirect_params = {
        "token": app_token,
        "email": app_user["email"],
        "full_name": app_user["full_name"],
        "profile_image": app_user.get("profile_image") or "",
    }
    callback_frontend = f"{_build_frontend_url('/oauth/callback')}?{urlencode(redirect_params)}"
    return RedirectResponse(url=callback_frontend)


@router.get("/github/login")
async def github_login():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    callback_url = os.getenv("GITHUB_CALLBACK_URL")

    if not client_id or not callback_url:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")

    state = _create_oauth_state("github")
    params = {
        "client_id": client_id,
        "redirect_uri": callback_url,
        "scope": "read:user user:email",
        "state": state,
    }
    github_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=github_url)


@router.get("/github/callback")
async def github_callback(code: str = Query(...), state: str = Query(...)):
    _validate_oauth_state(state, "github")

    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    callback_url = os.getenv("GITHUB_CALLBACK_URL")

    if not client_id or not client_secret or not callback_url:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": callback_url,
            },
            headers={"Accept": "application/json"},
        )

        if token_response.status_code >= 400:
            return _redirect_with_error("GitHub sign-in failed")

        token_data = token_response.json()
        provider_token = token_data.get("access_token")
        if not provider_token:
            return _redirect_with_error("GitHub sign-in failed")

        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {provider_token}",
                "Accept": "application/vnd.github+json",
            },
        )

        if user_response.status_code >= 400:
            return _redirect_with_error("GitHub profile fetch failed")

        gh_user = user_response.json()
        email = gh_user.get("email")
        full_name = gh_user.get("name") or gh_user.get("login")
        profile_image = gh_user.get("avatar_url")

        if not email:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {provider_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            if emails_response.status_code < 400:
                emails = emails_response.json()
                primary_verified = next(
                    (entry for entry in emails if entry.get("primary") and entry.get("verified")),
                    None,
                )
                any_verified = next((entry for entry in emails if entry.get("verified")), None)
                selected = primary_verified or any_verified
                if selected:
                    email = selected.get("email")

    if not email:
        return _redirect_with_error("GitHub account email not available")

    app_user = await _create_or_update_oauth_user(
        email=email,
        full_name=full_name or email,
        provider="github",
        profile_image=profile_image,
    )
    app_token = create_access_token(data={"sub": app_user["email"], "full_name": app_user["full_name"]})

    redirect_params = {
        "token": app_token,
        "email": app_user["email"],
        "full_name": app_user["full_name"],
        "profile_image": app_user.get("profile_image") or "",
    }
    callback_frontend = f"{_build_frontend_url('/oauth/callback')}?{urlencode(redirect_params)}"
    return RedirectResponse(url=callback_frontend)

# --- 4. NEW ROUTE: CHANGE PASSWORD ---
@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    if not verify_password(request.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hashed_password = get_password_hash(request.new_password)
    update_result = await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": new_hashed_password}}
    )
         
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await users_collection.find_one({"email": request.email})
    response = {
        "message": "If this email is registered, a password reset link has been sent."
    }

    if user:
        reset_token = create_password_reset_token(request.email)
        token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=30)

        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_token_hash": token_hash,
                    "password_reset_expires_at": expires_at,
                }
            },
        )

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={reset_token}"
        email_sent = True
        try:
            send_reset_email(request.email, reset_link)
        except Exception as exc:
            print(f"WARN: Failed to send reset email for {request.email}: {exc}")
            email_sent = False

        app_env = os.getenv("APP_ENV", "development").lower()
        if not email_sent and app_env != "production":
            response["dev_reset_link"] = reset_link
            response["email_status"] = "failed"

    return response


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    email = verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    stored_hash = user.get("password_reset_token_hash")
    expires_at = user.get("password_reset_expires_at")
    request_hash = hashlib.sha256(request.token.encode("utf-8")).hexdigest()

    if not stored_hash or stored_hash != request_hash:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not expires_at or datetime.utcnow() > expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    new_hashed_password = get_password_hash(request.new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"hashed_password": new_hashed_password},
            "$unset": {
                "password_reset_token_hash": "",
                "password_reset_expires_at": "",
            },
        },
    )

    return {"message": "Password reset successful. You can now log in."}