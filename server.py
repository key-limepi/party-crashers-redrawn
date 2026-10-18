#!/usr/bin/env python3
"""tiny multiplayer host
python server.py -> http://localhost:8000
python server.py 8080 -> http://localhost:8080

All the actual code lives in the backend/ package; this file just starts it.
"""
from backend.main import main

if __name__ == "__main__":
    main()
