"""Insert sample data for local development.

Usage (from the api container or backend/):
    python -m app.scripts.seed
"""

from app import models  # noqa: F401 — register ORM models
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import User

SAMPLE_USERS = [
    {
        "username": "maya",
        "email": "maya.chen@acme.studio",
        "password": "password123",
        "name": "Maya Chen",
    },
    {
        "username": "jordan",
        "email": "jordan.lee@acme.studio",
        "password": "password123",
        "name": "Jordan Lee",
    },
    {
        "username": "sam",
        "email": "sam.okonkwo@acme.studio",
        "password": "password123",
        "name": "Sam Okonkwo",
    },
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created = 0
        skipped = 0
        for item in SAMPLE_USERS:
            exists = (
                db.query(User)
                .filter(
                    (User.username == item["username"]) | (User.email == item["email"])
                )
                .first()
            )
            if exists is not None:
                print(f"skip  {item['username']} (already exists)")
                skipped += 1
                continue

            db.add(
                User(
                    username=item["username"],
                    email=item["email"],
                    hashed_password=hash_password(item["password"]),
                    name=item["name"],
                )
            )
            print(f"create {item['username']} / {item['email']}")
            created += 1

        db.commit()
        print(f"done: created={created} skipped={skipped}")
        print("default password for sample users: password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
