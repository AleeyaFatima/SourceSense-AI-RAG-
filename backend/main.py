import os
import shutil
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import init_db, engine
from app.core.security import get_password_hash
from app.models.models import User, Document
from app.services.ingestion import process_and_index_document
from app.api.auth import router as auth_router
from app.api.documents import router as doc_router
from app.api.chat import router as chat_router
from app.api.analytics import router as analytics_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(doc_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    # Create DB tables
    init_db()
    
    # Include import for background thread
    import threading

    def bg_startup_task():
        # Pre-load default admin user for easy demo login
        with Session(engine) as session:
            admin = session.exec(select(User).where(User.email == "admin@sourcesense.ai")).first()
            if not admin:
                admin = User(
                    email="admin@sourcesense.ai",
                    name="Default Administrator",
                    hashed_password=get_password_hash("password123")
                )
                session.add(admin)
                session.commit()
                session.refresh(admin)
                print("Created default admin user: admin@sourcesense.ai / password123")
                
            # Auto-ingest sample files if there are no documents in the database
            doc_count = len(session.exec(select(Document)).all())
            if doc_count == 0:
                print("Auto-ingestion check: No documents found. Ingesting samples...")
                samples_dir = "./data/samples"
                uploads_dir = "./data/uploads"
                os.makedirs(uploads_dir, exist_ok=True)
                
                if os.path.exists(samples_dir):
                    sample_files = [f for f in os.listdir(samples_dir) if f.endswith((".md", ".txt"))]
                    for file_name in sample_files:
                        src_path = os.path.join(samples_dir, file_name)
                        dest_path = os.path.join(uploads_dir, f"startup_{file_name}")
                        
                        try:
                            shutil.copy2(src_path, dest_path)
                            title = file_name.rsplit(".", 1)[0].replace("_", " ").title()
                            ext = file_name.rsplit(".", 1)[1]
                            
                            db_doc = Document(
                                user_id=admin.id,
                                title=title,
                                file_type=ext,
                                file_path=dest_path,
                                status="processing"
                            )
                            session.add(db_doc)
                            session.commit()
                            session.refresh(db_doc)
                            
                            print(f"Indexing sample: {title} (ID: {db_doc.id})...")
                            # Run indexer
                            process_and_index_document(session, db_doc.id)
                            
                        except Exception as e:
                            print(f"Failed to auto-ingest sample {file_name}: {e}")

    # Spin up background thread for model download and document pre-seeding
    threading.Thread(target=bg_startup_task, daemon=True).start()

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "api_docs": "/docs"
    }

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    # Disable reload on production to optimize performance
    reload = os.environ.get("ENV", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)

