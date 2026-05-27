import functions_framework
import logging
import os
import re
import json
import math
import exifread
import rasterio
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from google.cloud import storage
import firebase_admin
from firebase_admin import credentials, firestore as fb_firestore

# ==========================================
# MODULE-LEVEL SETUP
# ==========================================
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

_storage_client = storage.Client()
DESTINATION_BUCKET = os.environ.get("OUTPUT_BUCKET", "drone-ndvi-output")

_cred_raw = os.environ.get("FIREBASE_CREDENTIALS_JSON")
if not _cred_raw:
    raise RuntimeError(
        "FIREBASE_CREDENTIALS_JSON env var not set. "
        "Add the service account secret in Cloud Run → Variables & Secrets."
    )
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(json.loads(_cred_raw)))
_db = fb_firestore.client()

_PIXEL_PITCH_MM  = 0.0034
_FOCAL_LENGTH_MM = 4.34
_HEALTH_LABELS   = ["Kritis", "Stres", "Sedang", "Cukup", "Sehat"]

# WIB is UTC+7; used when parsing the datetime embedded in filenames.
_WIB = timezone(timedelta(hours=7))

# Filename pattern: <yyyymmdd>_<hhmmss>_SAWAH-<N>_<NIR|R>.tiff
_FILENAME_RE = re.compile(
    r'^(?P<datetime>\d{8}_\d{6})_(?P<sawah>SAWAH-\d+)_(?P<band>NIR|R)\.tiff$',
    re.IGNORECASE,
)


# ==========================================
# FIRESTORE SCHEMA
# ==========================================
# _meta/sawah_counter            → {lastNumber, updatedAt}               global sawah counter
# _meta/src_{base_name}          → {sawahId, captureId, processedAt}     idempotency record
#
# lahan/{sawahId}                → {fieldCode,
#                                    topLeft, topRight, bottomRight, bottomLeft,
#                                    createdAt, updatedAt}
#   meta/capture_counter         → {lastNumber, updatedAt}
#   captures/{captureId}         → {captureId, fieldCode,
#                                    gsd, gsdUnit,
#                                    imageBounds,
#                                    centerLat, centerLng,
#                                    ndviUrl,           ← gs://.../..._1_Raw_NDVI.png
#                                    clusterUrl,        ← gs://.../..._2_Fused_Grid_NDVI.png
#                                    gridsJsonUrl,      ← gs://.../..._grids.json  (all grid data)
#                                    rgbUrl,
#                                    capturedAt, createdAt, updatedAt}
#     inspection_points/{code}   → P1, P2, ..., P15
#                                  {pointCode, clusterId, clusterLabel,
#                                   inspectionLat, inspectionLng,
#                                   representativeGridCodes, createdAt}
#       sensor_readings/{id}     ← written by field sensor devices, NOT this pipeline
#                                  {pointCode, latitude, longitude,
#                                   co2Ppm, nh3Ppm, coPpm, no2Ppm,
#                                   temperatureC, humidityPct, recordedAt}
#     hama_detections/{id}       ← written by pest detection pipeline, NOT this pipeline
#
# NOTE: Grid data is NOT stored in Firestore.
#       All grid documents for a capture are serialised as a single JSON file
#       and uploaded to GCS at the path referenced by captures/{captureId}.gridsJsonUrl.
#       Grid JSON schema per element:
#         {gridCode, rowIndex, colIndex,
#          topLeft, topRight, bottomRight, bottomLeft,   ← {lat, lng}
#          clusterId, clusterLabel,                      ← health cluster (KMeans)
#          gridColor,                                    ← "Red" | "Yellow" | "Green"
#          spatialClusterId,
#          ndviMean, ndviMin, ndviMax, ndviStddev, ndviVariance,
#          ndviMedian, ndviP25, ndviP50, ndviP75,
#          createdAt}
# ==========================================


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_dji_gsd(filepath):
    try:
        with open(filepath, 'rb') as f:
            text = f.read(5 * 1024 * 1024).decode('latin-1', errors='ignore')
        match = re.search(r'drone-dji:RelativeAltitude="([^"]+)"', text)
        if not match:
            return None, None
        altitude_m = float(match.group(1))
        gsd_cm_px  = (altitude_m * 100 * _PIXEL_PITCH_MM) / _FOCAL_LENGTH_MM
        return gsd_cm_px, altitude_m
    except Exception:
        return None, None


def convert_to_decimal_degrees(value, ref):
    d = float(value.values[0].num) / float(value.values[0].den)
    m = float(value.values[1].num) / float(value.values[1].den)
    s = float(value.values[2].num) / float(value.values[2].den)
    decimal = d + (m / 60.0) + (s / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal


def get_gps_from_exif(filepath):
    with open(filepath, 'rb') as f:
        tags = exifread.process_file(f, details=False)
    if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
        lat = convert_to_decimal_degrees(tags['GPS GPSLatitude'],  tags['GPS GPSLatitudeRef'].printable)
        lon = convert_to_decimal_degrees(tags['GPS GPSLongitude'], tags['GPS GPSLongitudeRef'].printable)
        return lat, lon
    return None, None


def get_dji_yaw(filepath):
    """
    Extract GimbalYawDegree (preferred) or FlightYawDegree from DJI XMP metadata.
    Returns 0.0 (no rotation) if the tag is absent.
    """
    try:
        with open(filepath, 'rb') as f:
            text = f.read(5 * 1024 * 1024).decode('latin-1', errors='ignore')
        match = re.search(r'drone-dji:GimbalYawDegree="([^"]+)"', text)
        if not match:
            match = re.search(r'drone-dji:FlightYawDegree="([^"]+)"', text)
        if match:
            return float(match.group(1))
    except Exception as e:
        log.warning("Could not extract Yaw from %s: %s", filepath, e)
    return 0.0


def pixel_to_latlon(x_px, y_px, center_lat, center_lon,
                    img_width, img_height, gsd_m, yaw_degree=0.0):
    """
    Convert a pixel position to (lat, lon) with yaw rotation applied.

    The yaw rotation matrix maps image-space (right / up) axes onto
    geographic (east / north) axes so that a tilted image still produces
    correctly-oriented corner / grid coordinates.

      dx_m, dy_m  — signed metres from image centre (dy positive = up in image)
      up vector   — direction the top of the image points in geographic space
      right vector— direction the right of the image points (up rotated +90°)
      delta_east/north — true geographic offsets after applying the rotation
    """
    dx_m = (x_px - img_width  / 2.0) * gsd_m
    dy_m = (img_height / 2.0 - y_px) * gsd_m   # image Y flipped vs geographic N

    yaw_rad    = math.radians(yaw_degree)
    up_east    = math.sin(yaw_rad)
    up_north   = math.cos(yaw_rad)

    right_rad  = math.radians(yaw_degree + 90.0)
    right_east = math.sin(right_rad)
    right_north= math.cos(right_rad)

    delta_east_m  = dx_m * right_east  + dy_m * up_east
    delta_north_m = dx_m * right_north + dy_m * up_north

    lat = center_lat + (delta_north_m / 111320.0)
    lon = center_lon + (delta_east_m  / (111320.0 * math.cos(math.radians(center_lat))))
    return float(lat), float(lon)


def find_optimal_k_kmeans(data, max_k=10):
    actual_max = min(max_k, len(data) - 1)
    if actual_max < 2:
        return 1 if len(data) > 0 else 0
    best_k, best_score = 2, -1
    for k in range(2, actual_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(data)
        score  = silhouette_score(data, labels)
        if score > best_score:
            best_score = score
            best_k     = k
    return best_k


def row_idx_to_letters(idx):
    result = ""
    idx += 1
    while idx > 0:
        idx, r = divmod(idx - 1, 26)
        result = chr(65 + r) + result
    return result


def make_grid_code(row_idx, col_idx):
    return f"G{row_idx_to_letters(row_idx)}{col_idx + 1:03d}"


def resolve_health_label(cluster_id, total_clusters):
    if cluster_id < 0:
        return "Non-Tanaman"
    if total_clusters <= 1:
        return _HEALTH_LABELS[-1]
    idx = round(cluster_id / (total_clusters - 1) * (len(_HEALTH_LABELS) - 1))
    return _HEALTH_LABELS[idx]


# Map NDVI mean to a display colour for the dashboard.
def ndvi_to_grid_color(ndvi_mean: float) -> str:
    """
    Red    — NDVI < 0.1  (stressed / non-vegetated, includes negative values)
    Yellow — 0.1 ≤ NDVI ≤ 0.4  (moderate)
    Green  — NDVI > 0.4  (healthy)
    """
    if ndvi_mean < 0.1:
        return "Red"
    elif ndvi_mean <= 0.4:
        return "Yellow"
    else:
        return "Green"


def _commit_batches(ops):
    LIMIT = 500
    for i in range(0, len(ops), LIMIT):
        batch = _db.batch()
        for ref, data in ops[i:i + LIMIT]:
            batch.set(ref, data)
        batch.commit()
        log.info("Firestore batch committed: ops %d–%d of %d",
                 i + 1, min(i + LIMIT, len(ops)), len(ops))


# Bare-image renders only — no title, no colorbar, no padding, no axes.
# show_grid=True draws 1-px black grid lines at every pixels_per_grid boundary.
def _upload_plot(data, filename, dest_bucket, width, height, ppg, show_grid=False):
    """
    Render NDVI heatmap as a clean image (no decorations), upload to GCS,
    remove local temp file.
    """
    dpi = 100
    fig_w = width  / dpi
    fig_h = height / dpi

    fig = plt.figure(figsize=(fig_w, fig_h), dpi=dpi)
    ax  = fig.add_axes([0, 0, 1, 1])          # axes fills the entire figure — zero padding
    ax.imshow(data, cmap='RdYlGn', vmin=-1.0, vmax=1.0, interpolation='nearest',
              aspect='auto')
    ax.axis('off')

    if show_grid:
        # Vertical lines (column boundaries)
        for x in range(0, width, ppg):
            ax.axvline(x=x - 0.5, color='black', linewidth=0.4, alpha=0.5)
        # Horizontal lines (row boundaries)
        for y in range(0, height, ppg):
            ax.axhline(y=y - 0.5, color='black', linewidth=0.4, alpha=0.5)

    local = f'/tmp/{filename}'
    fig.savefig(local, dpi=dpi, bbox_inches='tight', pad_inches=0)
    plt.close(fig)

    dest_bucket.blob(filename).upload_from_filename(local)
    os.remove(local)
    log.info("Uploaded plot: %s", filename)


# Serialise grid list to JSON, upload to GCS, return the gs:// URL.
def _upload_grids_json(grid_meta, filename, dest_bucket):
    """
    Write all grid records for a capture as a single JSON file to GCS.
    Strips the internal '_center' key (used only for spatial clustering).
    Returns the gs:// URI string.
    """
    export = []
    for g in grid_meta:
        record = {k: v for k, v in g.items() if k != '_center'}
        export.append(record)

    local = f'/tmp/{filename}'
    with open(local, 'w', encoding='utf-8') as fh:
        json.dump(export, fh, ensure_ascii=False)

    dest_bucket.blob(filename).upload_from_filename(local, content_type='application/json')
    os.remove(local)

    uri = f'gs://{dest_bucket.name}/{filename}'
    log.info("Uploaded grids JSON (%d grids): %s", len(export), uri)
    return uri


def parse_filename_datetime(dt_str: str) -> str:
    naive = datetime.strptime(dt_str, "%Y%m%d_%H%M%S")
    return naive.replace(tzinfo=_WIB).isoformat()


def sawah_label_to_sw_code(sawah_label: str) -> str:
    n = int(re.search(r'\d+', sawah_label).group())
    return f"SW{n:03d}"


# ==========================================
# ATOMIC ID ALLOCATION
# ==========================================

@fb_firestore.transactional
def _allocate_ids(transaction, sawah_counter_ref, idempotency_ref, field_code_hint):
    now_iso = datetime.now(timezone.utc).isoformat()

    idem_snap = idempotency_ref.get(transaction=transaction)
    if idem_snap.exists:
        d = idem_snap.to_dict()
        return False, d['sawahId'], d['captureId']

    last_num = 0
    if not field_code_hint:
        c_snap   = sawah_counter_ref.get(transaction=transaction)
        last_num = c_snap.to_dict().get('lastNumber', 0) if c_snap.exists else 0
        sawah_id = f'SW{last_num + 1:03d}'
    else:
        sawah_id = field_code_hint

    cap_ref  = _db.collection('lahan').document(sawah_id) \
                  .collection('meta').document('capture_counter')
    cap_snap = cap_ref.get(transaction=transaction)
    last_cap = cap_snap.to_dict().get('lastNumber', 0) if cap_snap.exists else 0

    capture_id = f'CAP{last_cap + 1:03d}'

    if not field_code_hint:
        transaction.set(sawah_counter_ref,
                        {'lastNumber': last_num + 1, 'updatedAt': now_iso})

    transaction.set(cap_ref,
                    {'lastNumber': last_cap + 1, 'updatedAt': now_iso})

    transaction.set(idempotency_ref, {
        'sawahId':     sawah_id,
        'captureId':   capture_id,
        'processedAt': now_iso,
    })

    return True, sawah_id, capture_id


# ==========================================
# MAIN CLOUD FUNCTION ENTRYPOINT
# ==========================================

@functions_framework.cloud_event
def process_ndvi_images(cloud_event):
    data               = cloud_event.data
    source_bucket_name = data['bucket']
    file_name          = data['name']

    # ------------------------------------------------------------------
    # 1.  Identify band pair from filename
    # ------------------------------------------------------------------
    m = _FILENAME_RE.match(file_name)
    if not m:
        log.info("Skipping %s — does not match pattern <yyyymmdd>_<hhmmss>_SAWAH-<N>_<NIR|R>.tiff", file_name)
        return

    dt_token    = m.group('datetime')
    sawah_token = m.group('sawah').upper()
    band        = m.group('band').upper()

    base_name = f"{dt_token}_{sawah_token}"

    if band == 'R':
        r_name   = file_name
        nir_name = f"{base_name}_NIR.tiff"
    else:
        nir_name = file_name
        r_name   = f"{base_name}_R.tiff"

    field_code_hint = sawah_label_to_sw_code(sawah_token)
    captured_at_iso = parse_filename_datetime(dt_token)
    updated_at_iso  = datetime.now(timezone.utc).isoformat()

    log.info("Parsed filename: base=%s | sawah=%s → %s | capturedAt=%s",
             base_name, sawah_token, field_code_hint, captured_at_iso)

    # ------------------------------------------------------------------
    # 2.  Atomically resolve sawahId + captureId (includes idempotency check)
    # ------------------------------------------------------------------
    sawah_counter_ref = _db.collection('_meta').document('sawah_counter')
    idempotency_ref   = _db.collection('_meta').document(f'src_{base_name}')

    is_new, sawah_id, capture_id = _allocate_ids(
        _db.transaction(), sawah_counter_ref, idempotency_ref, field_code_hint
    )

    if not is_new:
        log.info("Already processed '%s' → lahan/%s/captures/%s — skipping.", base_name, sawah_id, capture_id)
        return

    log.info("Allocated: '%s' → lahan/%s/captures/%s", base_name, sawah_id, capture_id)

    # ------------------------------------------------------------------
    # 3.  Verify both source files exist before downloading
    # ------------------------------------------------------------------
    source_bucket = _storage_client.bucket(source_bucket_name)
    dest_bucket   = _storage_client.bucket(DESTINATION_BUCKET)
    r_blob        = source_bucket.blob(r_name)
    nir_blob      = source_bucket.blob(nir_name)

    if not r_blob.exists() or not nir_blob.exists():
        log.info("Partner file for '%s' not yet available — waiting.", base_name)
        return

    log.info("Both bands confirmed. Starting NDVI pipeline for '%s'.", base_name)

    # ------------------------------------------------------------------
    # 4.  Download both bands in parallel to /tmp
    # ------------------------------------------------------------------
    local_r   = f'/tmp/{r_name}'
    local_nir = f'/tmp/{nir_name}'

    with ThreadPoolExecutor(max_workers=2) as pool:
        futs = [
            pool.submit(r_blob.download_to_filename,   local_r),
            pool.submit(nir_blob.download_to_filename, local_nir),
        ]
        for fut in as_completed(futs):
            fut.result()

    try:
        # ------------------------------------------------------------------
        # 5.  Metadata extraction
        # ------------------------------------------------------------------
        gsd, alt = get_dji_gsd(local_nir)
        if not gsd:
            gsd = 2.5
        gsd_m = gsd / 100.0
        
        yaw = get_dji_yaw(local_nir)

        center_lat, center_lon = get_gps_from_exif(local_nir)
        if center_lat is None or center_lon is None:
            raise ValueError("Could not extract valid GPS coordinates from EXIF data.")

        log.info("Image Center: %.6f, %.6f | GSD: %.4f cm/px | Yaw: %.2f°", center_lat, center_lon, gsd, yaw)

        # ------------------------------------------------------------------
        # 6.  Read raster bands
        # ------------------------------------------------------------------
        with rasterio.open(local_r) as r_src:
            red = r_src.read(1).astype('float32')

        with rasterio.open(local_nir) as n_src:
            nir   = n_src.read(1).astype('float32')
            img_w = n_src.width
            img_h = n_src.height

        def corner(px, py):
            lt, ln = pixel_to_latlon(px, py, center_lat, center_lon, img_w, img_h, gsd_m, yaw)
            return {'lat': lt, 'lng': ln}

        image_bounds = {
            'topLeft':     corner(0,     0),
            'topRight':    corner(img_w, 0),
            'bottomRight': corner(img_w, img_h),
            'bottomLeft':  corner(0,     img_h),
        }

        # ------------------------------------------------------------------
        # 7.  NDVI calculation
        # ------------------------------------------------------------------
        with np.errstate(divide='ignore', invalid='ignore'):
            ndvi = (nir - red) / (nir + red)
            ndvi = np.where((nir + red) == 0, np.nan, ndvi)

        del red, nir

        field_median   = np.nanmedian(ndvi)
        dynamic_floor  = np.clip(field_median - 0.01, 0.2, 0.25)
        adaptive_floor = 0.2
        log.info("Median=%.3f | Dynamic Floor=%.3f | Using Floor=%.3f",
                 field_median, dynamic_floor, adaptive_floor)

        height, width   = ndvi.shape
        pixels_per_grid = max(1, int(1.0 / gsd_m))
        raw_zonal_ndvi  = np.full(ndvi.shape, np.nan)
        grid_meta       = []

        # ------------------------------------------------------------------
        # 8.  Zonal statistics per grid cell
        # ------------------------------------------------------------------
        for y in range(0, height, pixels_per_grid):
            row_idx = y // pixels_per_grid
            for x in range(0, width, pixels_per_grid):
                col_idx = x // pixels_per_grid
                y_e     = min(y + pixels_per_grid, height)
                x_e     = min(x + pixels_per_grid, width)
                block   = ndvi[y:y_e, x:x_e]
                valid   = block[~np.isnan(block)]

                if valid.size == 0:
                    continue

                grid_mean = np.mean(valid)
                raw_zonal_ndvi[y:y_e, x:x_e] = grid_mean

                g_lt1, g_ln1 = pixel_to_latlon(x,   y,   center_lat, center_lon, img_w, img_h, gsd_m, yaw)
                g_lt2, g_ln2 = pixel_to_latlon(x_e, y,   center_lat, center_lon, img_w, img_h, gsd_m, yaw)
                g_lt3, g_ln3 = pixel_to_latlon(x_e, y_e, center_lat, center_lon, img_w, img_h, gsd_m, yaw)
                g_lt4, g_ln4 = pixel_to_latlon(x,   y_e, center_lat, center_lon, img_w, img_h, gsd_m, yaw)
                c_lt,  c_ln  = pixel_to_latlon(
                    (x + x_e) / 2.0, (y + y_e) / 2.0,
                    center_lat, center_lon, img_w, img_h, gsd_m, yaw
                )

                quartiles = np.percentile(valid, [25, 50, 75])

                grid_meta.append({
                    'gridCode':     make_grid_code(row_idx, col_idx),
                    'rowIndex':     row_idx,
                    'colIndex':     col_idx,
                    'topLeft':      {'lat': g_lt1, 'lng': g_ln1},
                    'topRight':     {'lat': g_lt2, 'lng': g_ln2},
                    'bottomRight':  {'lat': g_lt3, 'lng': g_ln3},
                    'bottomLeft':   {'lat': g_lt4, 'lng': g_ln4},
                    '_center':      [c_ln, c_lt],
                    'ndviMean':     float(grid_mean),
                    'ndviMedian':   float(np.median(valid)),
                    'ndviMin':      float(np.min(valid)),
                    'ndviMax':      float(np.max(valid)),
                    'ndviStddev':   float(np.std(valid)),
                    'ndviVariance': float(np.var(valid)),
                    'ndviP25':      float(quartiles[0]),
                    'ndviP50':      float(quartiles[1]),
                    'ndviP75':      float(quartiles[2]),
                    'isPlant':      bool(grid_mean > adaptive_floor),
                    'gridColor':    ndvi_to_grid_color(float(grid_mean)),
                })

        # ------------------------------------------------------------------
        # 9.  Health clustering
        # ------------------------------------------------------------------
        plant_grids = [g for g in grid_meta if g['isPlant']]
        health_data = np.array([g['ndviMean'] for g in plant_grids]).reshape(-1, 1)
        optimal_k   = 1

        if len(health_data) > 0:
            optimal_k     = find_optimal_k_kmeans(health_data, max_k=10)
            kmeans_health = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
            health_labels = kmeans_health.fit_predict(health_data)

            cluster_means = kmeans_health.cluster_centers_.flatten()
            idx = np.argsort(cluster_means)
            lut = np.zeros(optimal_k, dtype=int)
            lut[idx] = np.arange(optimal_k)
            sorted_health_labels = lut[health_labels]

            for i, g in enumerate(plant_grids):
                g['clusterId']    = int(sorted_health_labels[i])
                g['clusterLabel'] = resolve_health_label(int(sorted_health_labels[i]), optimal_k)

            del health_data, health_labels, sorted_health_labels
        else:
            log.error("No plant grids found for '%s'. Aborting.", base_name)
            return

        for g in grid_meta:
            if not g['isPlant']:
                g['clusterId']    = -1
                g['clusterLabel'] = 'Non-Tanaman'

        # ------------------------------------------------------------------
        # 10.  Spatial clustering (hardcoded K=15)
        # ------------------------------------------------------------------
        stressed_grids  = [g for g in grid_meta if g.get('clusterId') == 0]
        stressed_coords = [g['_center'] for g in stressed_grids]
        inspection_points = []

        if len(stressed_coords) > 0:
            spatial_arr = np.array(stressed_coords)

            max_spatial_k     = min(15, len(spatial_arr))
            optimal_spatial_k = find_optimal_k_kmeans(spatial_arr, max_k=max_spatial_k)
            log.info("Optimal spatial k (computed but not used): %d", optimal_spatial_k)

            hardcoded_k    = min(15, len(spatial_arr))
            spatial_kmeans = KMeans(n_clusters=hardcoded_k, random_state=42, n_init=10)
            spatial_kmeans.fit(spatial_arr)

            plant_coords             = np.array([g['_center'] for g in plant_grids])
            all_plant_spatial_labels = spatial_kmeans.predict(plant_coords)
            for i, g in enumerate(plant_grids):
                g['spatialClusterId'] = int(all_plant_spatial_labels[i])

            stressed_zone_ids = spatial_kmeans.predict(spatial_arr)
            zone_grid_codes: dict[int, list] = {}
            for i, g in enumerate(stressed_grids):
                z = int(stressed_zone_ids[i])
                zone_grid_codes.setdefault(z, []).append(g['gridCode'])

            for z, centroid in enumerate(spatial_kmeans.cluster_centers_):
                inspection_points.append({
                    'pointCode':               f'P{z + 1}',
                    'clusterId':               z,
                    'clusterLabel':            f'Zona {z + 1}',
                    'inspectionLng':           float(centroid[0]),
                    'inspectionLat':           float(centroid[1]),
                    'representativeGridCodes': zone_grid_codes.get(z, []),
                    'createdAt':               captured_at_iso,
                })

            del spatial_arr, plant_coords, all_plant_spatial_labels, stressed_zone_ids

        for g in grid_meta:
            g.setdefault('spatialClusterId', None)

        # ------------------------------------------------------------------
        # 11.  Write to Firestore + GCS
        # ------------------------------------------------------------------
        plot_raw_name    = f'{base_name}_1_Raw_NDVI.png'
        plot_zonal_name  = f'{base_name}_2_Fused_Grid_NDVI.png'
        grids_json_name  = f'{base_name}_grids.json'

        ndvi_url         = f'gs://{DESTINATION_BUCKET}/{plot_raw_name}'
        cluster_url      = f'gs://{DESTINATION_BUCKET}/{plot_zonal_name}'

        sawah_ref   = _db.collection('lahan').document(sawah_id)
        capture_ref = sawah_ref.collection('captures').document(capture_id)

        # 11a. Lahan document
        sawah_ref.set({'createdAt': captured_at_iso}, merge=True)
        sawah_ref.set({
            'fieldCode': sawah_id,
            **image_bounds,
            'updatedAt': updated_at_iso,
        }, merge=True)
        log.info("Upserted lahan/%s", sawah_id)

        # 11b. Capture document
        # gridsJsonUrl is written after the JSON upload below; we pre-build the URI here.
        grids_json_uri = f'gs://{DESTINATION_BUCKET}/{grids_json_name}'

        capture_ref.set({
            'captureId':    capture_id,
            'fieldCode':    sawah_id,
            'gsd':          gsd,
            'gsdUnit':      'cm/px',
            'imageBounds':  image_bounds,
            'centerLat':    center_lat,
            'centerLng':    center_lon,
            'ndviUrl':      ndvi_url,
            'clusterUrl':   cluster_url,
            'gridsJsonUrl': grids_json_uri,
            'rgbUrl':       None,
            'capturedAt':   captured_at_iso,
            'createdAt':    captured_at_iso,
            'updatedAt':    updated_at_iso,
        })
        log.info("Created lahan/%s/captures/%s", sawah_id, capture_id)

        # 11c. Inspection point documents (still in Firestore — small, bounded count)
        if inspection_points:
            points_col = capture_ref.collection('inspection_points')
            point_ops  = [
                (points_col.document(p['pointCode']), p)
                for p in inspection_points
            ]
            _commit_batches(point_ops)
            log.info("Wrote %d inspection_point documents.", len(point_ops))

        # NOTE: sensor_readings and hama_detections subcollections are populated
        #       by external systems — see schema comment at top of file.

        # ------------------------------------------------------------------
        # 12.  Upload plots + grid JSON to GCS in parallel
        # ← CHANGED: plots no longer carry title/colorbar/padding;
        #   grid data goes to JSON instead of Firestore.
        # ------------------------------------------------------------------
        with ThreadPoolExecutor(max_workers=3) as pool:
            futs = [
                pool.submit(
                    _upload_plot,
                    ndvi, plot_raw_name, dest_bucket,
                    width, height, pixels_per_grid, False,   # raw — no grid overlay
                ),
                pool.submit(
                    _upload_plot,
                    raw_zonal_ndvi, plot_zonal_name, dest_bucket,
                    width, height, pixels_per_grid, True,    # fused — with grid overlay
                ),
                pool.submit(
                    _upload_grids_json,
                    grid_meta, grids_json_name, dest_bucket,
                ),
            ]
            for fut in as_completed(futs):
                fut.result()

        log.info("✅ Pipeline complete — lahan/%s/captures/%s | grids: %d → %s",
                 sawah_id, capture_id, len(grid_meta), grids_json_uri)

    except Exception as exc:
        log.exception("Pipeline failed for '%s': %s", base_name, exc)
        raise

    finally:
        for path in (local_r, local_nir):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass