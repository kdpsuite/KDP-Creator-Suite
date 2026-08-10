# Coloring Engine Upgrade — Implementation Plan (P0-Safe)

| Field | Value |
|---|---|
| **Status** | Document only — **not implemented** |
| **Date** | 2026-08-07 |
| **Playbook** | **P0-Safe** (locked combo below) |
| **Target repo** | KDP Creator Suite (`/home/unloved/kdpsuite/KDP-Creator-Suite`) |
| **Algorithm source** | kdp_converter (`/home/unloved/kdo_converter`) |
| **This doc** | Spec only. No feature branch, no code, no commit as of this writing. |

---

## 1. Goal

Ship **opt-in enhanced line-art** quality (kdp_converter-class controls) into the Suite’s existing Image→Coloring and Batch Coloring tools, without changing default output for current users/API clients, without new hosting, and without touching PDF format / Poppler / the standalone kdp_converter app.

### Non-goals

- Bitwise parity with skimage/`scikit-image` (deferred; OpenCV port only).
- PDF→raster coloring book / Poppler / `pdf2image`.
- Changes to `format-kdp` or `validate-kdp`.
- Porting kdp_converter React SPA, Flask shell, user CRUD, or UUID temp downloads.
- New auth, Stripe, quotas model, or dashboard plugin registry.
- Sidecar worker, queue, or moving API off Vercel.
- Hardening / archiving the standalone kdp_converter repo in this phase.
- Implementing any of this in the same change set as this document.

---

## 2. Why a feature branch later (not now)

When coding starts, use a dedicated branch so fragile-but-working Suite tools (JWT, quotas, batch, format-kdp, e2e) stay protected on `main`.

| Item | Choice |
|---|---|
| Repo | `/home/unloved/kdpsuite/KDP-Creator-Suite` |
| Recommended branch | `feat/coloring-engine-upgrade` (from current `main`) |
| Scope on branch | Coloring + batch-coloring only |
| Do **not** touch | `format-kdp`, `validate-kdp`, auth, Stripe, templates, unrelated dashboard tabs |
| Merge gate | Existing e2e `tests/e2e/pdf-processing.spec.js` green + side-by-side visual QA on 5–10 reference images |
| Rollback | Revert PR and/or keep `engine=legacy` as default |

**This document lands without creating that branch.** Stay on whatever branch already exists. Create `feat/coloring-engine-upgrade` only when implementation is explicitly requested.

Standalone `/home/unloved/kdo_converter` stays untouched in this phase (lab / reference only).

---

## 3. Locked combo (P0-Safe)

| ID | Choice | Why |
|---|---|---|
| **WS1-C** | Dual engine: `legacy` (current threshold) + `enhanced` (OpenCV reimplementation of kdp_converter knobs) | Default behavior unchanged; Enhanced is opt-in |
| **WS1 not A** | No `scikit-image` / `scipy` | Avoids Vercel bundle / cold-start risk |
| **WS3-B** | UI: Enhanced toggle + detail / contrast / edge / auto-threshold | Advanced params only when Enhanced is on |
| **WS4-A** | Stay on Vercel Flask | Zero infra rewiring |
| **WS5-B** | New `services/coloring.py` | Keeps route glue in `pdf_processing.py` stable; easy module revert |
| **WS6-A** (+ batch consistency) | Leave `format-kdp` alone; batch uses same dispatcher as single | No product-name merge; batch matches Enhanced when selected |
| **WS2-A** | Skip PDF raster / Poppler | Biggest risk sink; defer to a later branch |
| **WS7-A** | Guardrails on touched routes only | Clamps + safe errors; no full-suite hardening |

**Explicitly reject for this phase:** P3/P5 (sidecar), WS1-A (skimage), WS3-E (port SPA), WS2-B (Poppler on Vercel), raw WS1-B replace (silent default output change).

---

## 4. Current architecture (Suite)

**Location:** `backend-api/kdp-creator-api/`

### 4.1 Coloring helper today

`_coloring_bitmap` in `src/routes/pdf_processing.py` (~L152–180):

1. Open image bytes → RGB (Pillow).
2. Size to KDP trim via `get_kdp_dimensions(trim_size, 'print', with_bleed=…)` and `PRINT_DPI`.
3. Aspect-fit resize + white pad to target pixels.
4. OpenCV grayscale → fixed `cv2.threshold(..., threshold, 255, THRESH_BINARY)`.
5. Return PNG bytes.

No Sobel/Canny, no Otsu, no morphology, no hist-eq, no detail/contrast/edge knobs.

### 4.2 Endpoints (already JWT + quota + Supabase)

| Route | Handler | Notes |
|---|---|---|
| `POST /api/pdf/convert-coloring` | `convert_to_coloring` | Form: `file`, `threshold` (default 127), `trim_size`, `with_bleed`, `output_format` |
| `POST /api/pdf/batch-coloring` | `batch_convert_coloring` | Multi-file FormData + `file_order`; same `_coloring_bitmap`; optional cover; pad to min even page count |

Response contract (keep unchanged): signed `download_url`, `preview`, size/format/trim metadata via existing `success_response` / analytics helpers. Do **not** adopt kdp_converter’s `/api/download/<task_id>` pattern.

### 4.3 Frontend today

- Tools live in `web-dashboard/kdp-creator-dashboard/src/components/dashboard/DashboardContent.jsx`.
- API: `pdfApi.convertColoring` / `convertColoringBatch` in `src/lib/api.js` → `/pdf/convert-coloring` and `/pdf/batch-coloring`.
- Single convert currently sends `file` + `trim_size` only (server defaults fill threshold/bleed).
- Batch sends files + `file_order` + `trim_size` (+ optional cover fields). ~4 MB client caution; batch timeout 300s.

### 4.4 Existing services layout

`src/services/` already has `kdp_specs.py`, `template_generator.py`, etc. New coloring module fits here (`WS5-B`).

---

## 5. Source algorithm reference (kdp_converter)

**Product name:** kdp_converter (KDP Coloring Book Converter)  
**Local path:** `/home/unloved/kdo_converter`  
**Function:** `convert_image_to_coloring_book(input_path, output_path, config)` in  
`kdp_converter_backend/src/routes/converter.py` (~L114+)

### Config knobs (reference contract)

| Key | Values / range | Default in kdp_converter |
|---|---|---|
| `detail_level` | `low` \| `medium` \| `high` | `medium` |
| `threshold` | `auto` or int 0–255 | `auto` |
| `contrast` | int −50…50 | `0` |
| `edge_enhancement` | `off` \| `mild` \| `strong` | `mild` |
| `trim_size` / `with_bleed` / `dpi` | sizing | Suite should keep Suite sizing (`get_kdp_dimensions` / `PRINT_DPI`) |

### Pipeline stages (behavioral target for OpenCV port)

1. Load image; flatten transparency onto white; RGB.
2. Resize to target print pixels (kdp_converter stretch-to-box; Suite today aspect-fits + pads — **keep Suite framing** for consistency with other Suite tools).
3. Grayscale.
4. Histogram equalization.
5. Optional contrast enhance (`ImageEnhance.Contrast`, factor `1 + contrast/100`).
6. Gaussian blur sigma by detail (`low`→2.0, `medium`→1.0, `high`→0.5).
7. Sobel edges; optional binary dilation (`mild`/`strong`).
8. Threshold on contrast-adjusted gray (`auto` → Otsu; else manual).
9. Binary dark-as-line; morphology remove small objects/holes.
10. OR edges into binary; emit black lines on white (PNG / PDF in kdp_converter).

**P0-Safe port:** Reimplement stages 4–10 with **OpenCV + Pillow + numpy only** (already in Suite). Do not add skimage/scipy. Accept non-bitwise identity; gate on visual QA.

**I/O adapter:** Suite uses `img_bytes` in / PNG bytes out. kdp_converter uses filesystem paths. Port logic into byte-oriented helpers; do not copy path-based API or temp download flow.

---

## 6. Target design

```
Form / UI
  engine = legacy | enhanced   (default: legacy)
  + optional enhanced params
        │
        ▼
pdf_processing routes (thin)
  convert-coloring / batch-coloring
        │
        ▼
_coloring_bitmap(...)   # dispatcher only
        │
        ├── engine=legacy  → services.coloring.legacy_coloring_bitmap
        └── engine=enhanced → services.coloring.enhanced_coloring_bitmap
```

### Dispatcher rules

- Default `engine=legacy` (or omit field) → **identical** behavior to today’s `_coloring_bitmap` body (moved, not rewritten).
- `engine=enhanced` → OpenCV enhanced pipeline; ignore unused legacy-only assumptions as needed.
- Both engines share Suite trim/bleed/DPI framing and return PNG bytes for existing PDF wrapping.
- Batch must call the same dispatcher with the same form fields so single and batch stay consistent (`WS6-E` spirit under `WS6-A`).

### Why not “just replace `_coloring_bitmap`”

A silent replace changes every coloring download the day you merge (including clients that only send `threshold`). On a fragile dashboard, that is support/break risk. Dual engine with legacy default keeps API/UI backward compatible.

---

## 7. File-by-file implementation steps (when coding starts)

Execute only after creating `feat/coloring-engine-upgrade`. Order matters.

### Step 0 — Branch hygiene

1. From Suite `main`: `git checkout -b feat/coloring-engine-upgrade`
2. Do not modify kdp_converter repo for this feature.

### Step 1 — Extract legacy path (`WS5-B`)

**Create:** `backend-api/kdp-creator-api/src/services/coloring.py`

- Move current `_coloring_bitmap` body into `legacy_coloring_bitmap(img_bytes, trim_size, threshold=127, with_bleed=True) -> bytes`.
- Keep imports local to what the function needs (Pillow, cv2, numpy, `get_kdp_dimensions`, `PRINT_DPI`).
- Add module docstring stating: enhanced is OpenCV port of kdp_converter knobs; not skimage verbatim.

**Edit:** `src/routes/pdf_processing.py`

- Replace inline body with import + thin `_coloring_bitmap(...)` that calls `legacy_coloring_bitmap` initially (or dispatcher with default legacy).
- No route signature changes yet beyond preparing for new form fields.

### Step 2 — Implement enhanced OpenCV pipeline

**In:** `services/coloring.py`

- Add `enhanced_coloring_bitmap(img_bytes, trim_size, *, with_bleed=True, detail_level='medium', threshold='auto'|int, contrast=0, edge_enhancement='mild') -> bytes`.
- Framing: reuse Suite resize/pad logic (extract shared `_prepare_canvas(...)` if it reduces duplication without rewriting behavior).
- Map knobs:
  - Detail → `cv2.GaussianBlur` sigma equivalent.
  - Contrast → Pillow `ImageEnhance` or OpenCV linear contrast on uint8.
  - Edges → `cv2.Sobel` (or Canny if Sobel quality fails QA) + morphology dilate for mild/strong.
  - Threshold → `cv2.THRESH_OTSU` when `auto`, else fixed threshold; combine with edge mask similarly to reference.
  - Cleanup → `cv2.morphologyEx` / connected-component size filters approximating remove_small_objects/holes.
- Clamp inputs (see §9 / WS7-A) inside the service or at the route boundary.

### Step 3 — Dispatcher

**In:** `pdf_processing.py` (or coloring.py + call from routes)

```text
_coloring_bitmap(..., engine='legacy', **enhanced_kwargs)
  if engine == 'enhanced': return enhanced_coloring_bitmap(...)
  return legacy_coloring_bitmap(...)
```

Unknown `engine` → 400 with stable error code (e.g. `INVALID_ENGINE`), not 500.

### Step 4 — Route form fields (additive)

**Edit:** `convert_to_coloring` and `batch_convert_coloring` in `pdf_processing.py`

- Parse optional fields (§8). Defaults must yield legacy path when omitted.
- Pass through to dispatcher.
- Keep JWT, rate limit, quota, upload_file, analytics, response JSON shape.
- On failure: log server-side; return existing safe `error_response` pattern (no raw `str(e)` leakage beyond current Suite norms). Optional: include `engine` in analytics payload (`WS7-D` light touch — nice-to-have, not blocking).

### Step 5 — Frontend (`WS3-B`)

**Edit:** `DashboardContent.jsx` (coloring + batch tool sections only)

- Add checkbox/toggle: **Enhanced line art** (off by default).
- When on, reveal:
  - Detail: low / medium / high
  - Contrast: slider −50…50
  - Edge enhancement: off / mild / strong
  - Threshold: Auto checkbox + manual 0–255 when Auto off
- When off: UI identical to today (no new clutter).
- Append FormData: `engine=enhanced` + param fields only when toggle on; when off, omit or send `engine=legacy`.

**Edit:** `api.js` only if needed for headers/timeouts — FormData field pass-through already works; prefer no API module rewrite.

**Do not:** extract tool components (`WS3-C`), port SPA (`WS3-E`), or add preview-compare UI (`WS3-F`) in this phase.

### Step 6 — Guardrails (`WS7-A`)

On touched routes / service only:

- Max image dimensions (e.g. reject or downscale before processing if decode exceeds N px — pick a limit consistent with Suite memory; document the constant in code).
- Clamp `contrast` to [−50, 50]; `threshold` int to [0, 255] or `auto`; allowlists for enums.
- Keep existing conversion/batch quotas and rate limits.
- Log duration / engine via existing `PerformanceTimer` / analytics if cheap.

### Step 7 — Dependencies

- **No new pip packages** for P0-Safe (OpenCV already present).
- Do not add `scikit-image` / `scipy` on this branch.

### Step 8 — Tests & PR

See §10. Open PR Suite `feat/coloring-engine-upgrade` → `main`. Merge only when gates pass.

---

## 8. API — additive form fields and defaults

Existing fields remain. New fields are optional.

| Field | Applies | Default if omitted | Notes |
|---|---|---|---|
| `engine` | single + batch | `legacy` | `legacy` \| `enhanced` |
| `detail_level` | enhanced | `medium` | Ignored when legacy |
| `contrast` | enhanced | `0` | int −50…50 |
| `edge_enhancement` | enhanced | `mild` | `off` \| `mild` \| `strong` |
| `threshold` | both | legacy: `127`; enhanced: prefer `auto` when engine=enhanced and client sends `auto` | Legacy path keeps today’s int default when omitted. For enhanced, UI should send `auto` or int. Parser must accept `auto` string without crashing `int(...)`. |

**Contract rules**

- Success JSON shape unchanged (additive response keys allowed later, not required).
- Clients that send only today’s fields get **byte-equivalent legacy** output (modulo non-deterministic env — aim for algorithm-identical).
- Invalid enum/clamp → 400 with explicit code, not silent coerce to weird values (except documented clamps).

---

## 9. UI changes (summary)

| Surface | Change |
|---|---|
| Image→Coloring card | Enhanced toggle; conditional advanced controls; FormData wiring |
| Batch Coloring card | Same toggle/controls; apply to every page in the batch |
| format-kdp / validate | **None** |
| Mobile Flutter | Out of scope (`WS3-G` later); API remains backward compatible |

Copy guidance: label clearly as “Enhanced line art” / advanced options — do not rename tools to “kdp_converter” or merge with Format KDP branding.

---

## 10. Test / merge gates

| Gate | Requirement |
|---|---|
| Unit / smoke | Legacy path: same inputs → same style output as pre-change (spot-check fixed fixture). Enhanced: runs without exception on sample set. |
| E2E | `tests/e2e/pdf-processing.spec.js` green (auth + coloring happy path). Extend only if e2e hard-codes fields that would break — prefer keep defaults so existing tests still hit legacy. |
| Visual QA | 5–10 reference images: photo, line drawing, busy illustration, low-contrast, high-contrast. Compare legacy vs enhanced vs (optional) kdp_converter lab export. |
| Deploy | Vercel preview: cold start acceptable; no OOM on typical dashboard upload sizes. |
| Rollback | Default remains legacy; emergency = revert PR. |

Do not block merge on golden SSIM suite (`WS7-B`) in P0-Safe; add later if quality regressions appear.

---

## 11. Out of scope / rejected options

| Rejected | Reason |
|---|---|
| WS1-A skimage verbatim | Bundle/cold-start / float64 at print DPI on Vercel |
| Raw WS1-B replace default | Silent break of existing downloads |
| WS2-B Poppler on Vercel | System binary + multipage RAM / timeout physics |
| WS2-C/D/F PDF coloring paths | Separate infrastructure project |
| WS3-C/D/E component extract / link-out / SPA port | Churn without ROI this phase |
| WS4-B/C/D/E sidecar / queue / move host | Infra not needed for image path |
| WS5-A paste into routes only | Drift; harder revert than `services/coloring.py` |
| WS5-C shared package / submodule | Overhead for solo; broken submodule history in kdp_converter |
| WS6-B/C/D format-kdp merge / proxy | Product confusion; splits quotas |
| WS1-E paid ML APIs | Project constraint: no paid APIs |
| JS rewrite of CV pipeline | Suite is Python; high cost, no benefit |
| Shipping kdp_converter debug Flask / open user CRUD / temp UUID downloads | Security and contract mismatch |

### Optional later branches (not now)

- `feat/coloring-skimage` — if OpenCV enhanced quality insufficient (WS1-A).
- `feat/pdf-coloring-worker` — Poppler PDF→book (P3).
- Archive standalone kdp_converter only after Enhanced is trusted (WS5-D/E).

---

## 12. Effort estimate

| Metric | Estimate |
|---|---|
| Solo effort | **~2–3 days** |
| API contract | Additive fields only |
| Infra | None (Vercel as-is) |
| Blast radius | Coloring + batch only |
| Worst case on merge | Flip default / revert PR |

Rough split: ~0.5 d extract legacy + dispatcher; ~1–1.5 d OpenCV enhanced + clamps; ~0.5 d UI; ~0.5 d QA/e2e/PR.

---

## 13. Implementation checklist (copy into PR when coding)

- [ ] Branch `feat/coloring-engine-upgrade` from Suite `main`
- [ ] Add `services/coloring.py` with `legacy_coloring_bitmap` + `enhanced_coloring_bitmap`
- [ ] Thin `_coloring_bitmap` dispatcher; default `engine=legacy`
- [ ] Wire optional form fields on `convert-coloring` and `batch-coloring`
- [ ] Dashboard Enhanced toggle + advanced controls (single + batch)
- [ ] WS7-A clamps / allowlists / safe errors on touched paths
- [ ] No new heavy deps; no format-kdp / Poppler / kdp_converter SPA
- [ ] E2E green + visual QA on reference set
- [ ] PR → merge; leave kdp_converter repo unchanged

---

## 14. References

- Options / lock decision: `/home/unloved/.cursor/plans/full_repo_review_0050917e.plan.md` (P0-Safe section)
- Suite coloring: `backend-api/kdp-creator-api/src/routes/pdf_processing.py` (`_coloring_bitmap`, `/pdf/convert-coloring`, `/pdf/batch-coloring`)
- Source algorithm: `/home/unloved/kdo_converter/kdp_converter_backend/src/routes/converter.py` → `convert_image_to_coloring_book`
- Dashboard: `web-dashboard/kdp-creator-dashboard/src/components/dashboard/DashboardContent.jsx`
- API client: `web-dashboard/kdp-creator-dashboard/src/lib/api.js`

---

*Document only. Implementation begins when explicitly requested; create `feat/coloring-engine-upgrade` at that time, not before.*
