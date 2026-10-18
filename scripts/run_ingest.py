#!/usr/bin/env python3
"""Helper script to run PDF ingestion for NEXUS AI vector store."""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.rag.ingest import run_ingestion

if __name__ == "__main__":
    print("Running document ingestion pipeline...")
    stats = run_ingestion()
    print("Ingestion results:")
    for k, v in stats.items():
        print(f"  {k}: {v}")
