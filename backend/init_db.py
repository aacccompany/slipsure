import asyncio
from app.database import engine, Base
from app.models import User
from app.security import get_password_hash

async def init():
    print("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed admin user
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        admin_user = User(
            email="admin", # Using 'admin' as requested, even if not a standard email
            hashed_password=get_password_hash("admin"),
            full_name="System Administrator",
            company_name="Slipsure Admin",
            plan="Enterprise Plan"
        )
        session.add(admin_user)
        await session.commit()
        print("Admin user created (admin/admin)")
    
    print("Database initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init())
