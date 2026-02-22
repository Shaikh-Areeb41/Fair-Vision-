from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from database import users_collection
from security import (
    verify_password,
    get_password_hash,
    SECRET_KEY,
    ALGORITHM,
    create_password_reset_token,
    verify_password_reset_token,
)
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
import hashlib
import os
import resend

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
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    from security import create_access_token # Import locally to avoid circulars
    access_token = create_access_token(data={"sub": user.email, "full_name": db_user["full_name"]})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"email": db_user["email"], "full_name": db_user["full_name"]}
    }

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