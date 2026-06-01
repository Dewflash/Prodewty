from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import logs, rpg

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prodewty API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logs.router)
app.include_router(rpg.router)


@app.get("/health")
def health():
    return {"status": "ok"}
