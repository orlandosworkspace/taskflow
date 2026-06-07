"""Password hashing and session tokens (stdlib only)."""

import hashlib
import secrets


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        'sha256', password.encode(), salt.encode(), 100000
    ).hex()
    return f'{salt}${digest}'


def verify_password(password, stored):
    salt, digest = stored.split('$', 1)
    check = hashlib.pbkdf2_hmac(
        'sha256', password.encode(), salt.encode(), 100000
    ).hex()
    return secrets.compare_digest(check, digest)


def create_token():
    return secrets.token_urlsafe(32)