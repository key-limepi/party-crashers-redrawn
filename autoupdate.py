"""starts the server and keeps it fresh.
pulls the newest code when it starts, then pulls and restarts the server every day at UPDATE_TIME.
settings (all optional, put them in .env):
  AUTO_UPDATE=true         set to false to turn this off
  UPDATE_TIME=02:00        24 hour time, hh:mm
  UPDATE_TZ=America/New_York   timezone for UPDATE_TIME (2 am est by default)
"""
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)


def load_env():
    # same idea as backend/config.py, real env vars win
    try:
        with open(os.path.join(here, ".env"), encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.split("#")[0].strip().strip("\"'"))
    except OSError:
        pass


load_env()
auto = os.environ.get("AUTO_UPDATE", "true").lower() not in ("0", "false", "off", "no")
update_time = os.environ.get("UPDATE_TIME", "02:00")
update_tz = os.environ.get("UPDATE_TZ", "America/New_York")


def get_tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(update_tz)
    except Exception:
        # no timezone database (common on windows), fall back to plain est
        print("[UPDATE] no tz database for " + update_tz + ", using fixed UTC-5 (pip install tzdata fixes this)", flush=True)
        return timezone(timedelta(hours=-5))


def next_update(tz):
    try:
        hh, mm = update_time.split(":")
        hh, mm = int(hh), int(mm)
    except ValueError:
        print("[UPDATE] bad UPDATE_TIME " + update_time + ", using 02:00", flush=True)
        hh, mm = 2, 0
    now = datetime.now(tz)
    target = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=1)
    return target


def pull():
    # fast forward only, autostash keeps local edits like admins.txt
    if not os.path.isdir(os.path.join(here, ".git")):
        print("[UPDATE] not a git folder, skipping pull", flush=True)
        return
    try:
        r = subprocess.run(["git", "pull", "--ff-only", "--autostash"], capture_output=True, text=True, timeout=180)
        print("[UPDATE] " + (r.stdout.strip() or r.stderr.strip() or "done"), flush=True)
    except Exception as e:
        print("[UPDATE] pull failed: " + str(e), flush=True)


def start_server():
    return subprocess.Popen([sys.executable, "server.py"] + sys.argv[1:])


def stop_server(proc):
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()


def main():
    if not auto:
        sys.exit(subprocess.call([sys.executable, "server.py"] + sys.argv[1:]))
    tz = get_tz()
    pull()
    proc = start_server()
    target = next_update(tz)
    print("[UPDATE] next update and restart: " + str(target), flush=True)
    try:
        while True:
            time.sleep(5)
            if proc.poll() is not None:
                # server stopped on its own, so stop too
                sys.exit(proc.returncode)
            if datetime.now(tz) >= target:
                print("[UPDATE] daily update time!!", flush=True)
                pull()
                stop_server(proc)
                proc = start_server()
                target = next_update(tz)
                print("[UPDATE] server restarted, next update: " + str(target), flush=True)
    except KeyboardInterrupt:
        stop_server(proc)
        print("\nbye!! :D", flush=True)


if __name__ == "__main__":
    main()
