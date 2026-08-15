#!/usr/bin/env bash
# Ensure dashboard.kdpsuite.com is canonical and www.dashboard redirects to it.
# Uses Vercel CLI auth (~/.local/share/com.vercel.cli/auth.json). No secrets printed.
#
# Usage: ./scripts/vercel-canonical-dashboard-domain.sh
# Optional: --fix  (PATCH domains if wrong)

set -euo pipefail

FIX=0
[[ "${1:-}" == "--fix" ]] && FIX=1

python3 - "$FIX" <<'PY'
import json, sys, urllib.request
from pathlib import Path

fix = sys.argv[1] == "1"
auth = json.loads(Path.home().joinpath(".local/share/com.vercel.cli/auth.json").read_text())
token = auth.get("token") or auth.get("accessToken")
assert token, "vercel CLI not logged in"
team = "team_HXJtoHYfGxcinSzDLx6XyTpc"
proj = "prj_rfKbsRS607E9DbsMjAYgtCxdJih3"
apex = "dashboard.kdpsuite.com"
www = "www.dashboard.kdpsuite.com"

def get_domains():
    req = urllib.request.Request(
        f"https://api.vercel.com/v9/projects/{proj}/domains?teamId={team}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return {d["name"]: d for d in (json.load(r).get("domains") or [])}

def patch(domain, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.vercel.com/v9/projects/{proj}/domains/{domain}?teamId={team}",
        data=data,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

domains = get_domains()
if apex not in domains or www not in domains:
    print("MISSING domain(s) on dashboard-frontend:", sorted(domains))
    sys.exit(1)

apex_redir = domains[apex].get("redirect")
www_redir = domains[www].get("redirect")
print(f"apex redirect={apex_redir!r}")
print(f"www  redirect={www_redir!r}")

ok = apex_redir in (None, "") and www_redir in (apex, f"https://{apex}")
if ok:
    print("OK: canonical host is dashboard.kdpsuite.com")
    sys.exit(0)

print("BAD: expected apex redirect=None and www → dashboard.kdpsuite.com")
if not fix:
    print("Re-run with --fix to PATCH.")
    sys.exit(1)

patch(apex, {"redirect": None, "redirectStatusCode": None})
patch(www, {"redirect": apex, "redirectStatusCode": 308})
domains = get_domains()
print("fixed apex redirect=", domains[apex].get("redirect"))
print("fixed www  redirect=", domains[www].get("redirect"))
PY
