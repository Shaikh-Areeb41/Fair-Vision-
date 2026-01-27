from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from database import users_collection
from security import verify_password, get_password_hash, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer

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
    print(f"DEBUG: Attempting password change for {current_user.get('email')}")

    # A. Verify OLD password
    if not verify_password(request.current_password, current_user["hashed_password"]):
        print("DEBUG: Current password mismatch")
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # B. Hash NEW password
    new_hashed_password = get_password_hash(request.new_password)
    print(f"DEBUG: New password hashed successfully. Updating DB for ID: {current_user['_id']}")

    # C. Update Database
    update_result = await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": new_hashed_password}}
    )

    print(f"DEBUG: Modified count: {update_result.modified_count}")
    
    if update_result.modified_count == 0:
        # This might happen if the new password is exact same as old one (hashed)
        # or if the DB query failed to find the document (unlikely since we just found it)
        print("DEBUG: No document modified!")
        
    return {"message": "Password updated successfully"}