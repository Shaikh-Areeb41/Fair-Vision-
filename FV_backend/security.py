from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import hashlib  # <--- NEW IMPORT

# CONFIGURATION
SECRET_KEY = "fairvision_secret_key_change_this_in_prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# We revert to a standard configuration since we will handle the length manually
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # 1. Pre-hash with SHA256 to ensure standard length
    # SHA256 produces a 64-character string, which is always safe for bcrypt (limit 72)
    safe_password = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    
    # 2. Verify the safe hash against the stored hash
    return pwd_context.verify(safe_password, hashed_password)

def get_password_hash(password):
    # 1. Pre-hash with SHA256
    safe_password = hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    # 2. Hash the result with bcrypt
    return pwd_context.hash(safe_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt