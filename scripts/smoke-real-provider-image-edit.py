import argparse
import json
import os
import re
import struct
import subprocess
import sys
import time
import zlib
from pathlib import Path
from urllib.parse import urlparse


CAPABILITIES = ("img2img", "person_consistency", "inpaint", "upscale_2x", "upscale_4x")
GPT_IMAGE_REFERENCE_CAPABILITIES = {"img2img", "person_consistency", "inpaint"}
IMAGE_FAMILY = {
    "image",
    "txt2img",
    "img2img",
    "inpaint",
    "upscale_2x",
    "upscale_4x",
    "person_consistency",
}
ACTIVE_FALLBACKS = {
    "img2img": ("img2img", "image", "txt2img"),
    "person_consistency": ("person_consistency", "image", "txt2img"),
    "inpaint": ("inpaint", "image", "txt2img"),
    "upscale_2x": ("upscale_2x",),
    "upscale_4x": ("upscale_4x", "upscale_2x"),
}
SENSITIVE_KEY_PATTERN = re.compile(
    r"api[-_]?key|token|password|secret|credential|authorization",
    re.IGNORECASE,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Run an opt-in real provider smoke for image reference, image-to-image, "
            "person consistency, and inpaint upload paths."
        )
    )
    parser.add_argument(
        "--capability",
        choices=(*CAPABILITIES, "all"),
        default="person_consistency",
    )
    parser.add_argument("--config-path", default="")
    parser.add_argument("--config-id", default="")
    parser.add_argument("--reference-image", default="")
    parser.add_argument(
        "--extra-reference-image",
        action="append",
        default=[],
        help="Additional reference image. Can be passed multiple times.",
    )
    parser.add_argument(
        "--reference-images",
        default="",
        help="Comma-separated or JSON array reference image list. Appended after --reference-image.",
    )
    parser.add_argument("--source-image", default="")
    parser.add_argument("--mask-image", default="")
    parser.add_argument(
        "--auto-mask",
        action="store_true",
        help="Create a simple center-rectangle PNG mask for inpaint when --mask-image is omitted.",
    )
    parser.add_argument(
        "--mask-rect",
        default="",
        help=(
            "Optional inpaint mask rectangle as x,y,width,height. "
            "Use 0-1 ratios or pixel values; ignored when --mask-image is set."
        ),
    )
    parser.add_argument("--prompt", default="")
    parser.add_argument("--person-context-json", default="")
    parser.add_argument("--size", default="")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument(
        "--quality",
        choices=("auto", "low", "medium", "high"),
        default="",
        help="Optional gpt-image output quality.",
    )
    parser.add_argument(
        "--output-format",
        choices=("png", "jpeg", "webp"),
        default="",
        help="Optional output image format.",
    )
    parser.add_argument(
        "--output-compression",
        type=int,
        default=-1,
        help="Optional JPEG/WebP compression, 0-100.",
    )
    parser.add_argument(
        "--background",
        choices=("auto", "opaque"),
        default="",
        help="Optional gpt-image background mode.",
    )
    parser.add_argument(
        "--moderation",
        choices=("auto", "low"),
        default="",
        help="Optional gpt-image moderation mode.",
    )
    parser.add_argument("--timeout-seconds", type=int, default=0)
    parser.add_argument("--out-dir", default="")
    parser.add_argument(
        "--preflight",
        action="store_true",
        help="Validate config and local files, then write sanitized payloads without sending provider requests.",
    )
    parser.add_argument(
        "--list-configs",
        action="store_true",
        help="Print a sanitized summary of local model configs and exit.",
    )
    parser.add_argument(
        "--allow-temp-capability",
        action="store_true",
        help="Temporarily add the requested native capability to the sidecar payload.",
    )
    return parser.parse_args()


def require_real_smoke_enabled():
    if os.environ.get("MONSTER_REAL_PROVIDER_SMOKE") != "1":
        raise RuntimeError(
            "Set MONSTER_REAL_PROVIDER_SMOKE=1 to run real provider requests."
        )


def repo_root():
    return Path(__file__).resolve().parents[1]


def default_config_path():
    return Path.home() / ".monster-tools" / "config.json"


def read_json(path):
    with Path(path).open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value):
    return str(value or "").strip()


def normalize_capabilities(value):
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        clean = clean_text(item)
        if clean and clean not in result:
            result.append(clean)
    if any(item in IMAGE_FAMILY for item in result):
        if "image" not in result:
            result.append("image")
        if "txt2img" not in result:
            result.append("txt2img")
    return result


def is_gpt_image_config(config):
    image_model = clean_text(config.get("imageModel") or config.get("model")).lower()
    return image_model.startswith("gpt-image-")


def has_capability(config, capability):
    if capability in GPT_IMAGE_REFERENCE_CAPABILITIES and is_gpt_image_config(config):
        return True
    return capability in normalize_capabilities(config.get("capabilities"))


def get_model_configs(config_root):
    configs = config_root.get("aiModelConfigs")
    if isinstance(configs, list) and configs:
        return [item for item in configs if isinstance(item, dict)]
    legacy = config_root.get("aiProvider")
    return [legacy] if isinstance(legacy, dict) else []


def active_config_id(config_root, capability):
    active = config_root.get("aiActiveModelConfigs")
    if not isinstance(active, dict):
        return ""
    for key in ACTIVE_FALLBACKS[capability]:
        clean = clean_text(active.get(key))
        if clean:
            return clean
    return ""


def select_config(config_root, capability, config_id, allow_temp_capability=False):
    configs = get_model_configs(config_root)
    if not configs:
        raise RuntimeError("No AI model configs found.")

    if config_id:
        selected = next((item for item in configs if clean_text(item.get("id")) == config_id), None)
        if selected:
            if has_capability(selected, capability) or allow_temp_capability:
                return selected
            raise RuntimeError(
                "Selected config does not declare {0}. Pass --allow-temp-capability "
                "to test the upload contract without changing saved config.".format(capability)
            )
        raise RuntimeError("Config id not found: {0}".format(config_id))

    active_id = active_config_id(config_root, capability)
    selected = next((item for item in configs if clean_text(item.get("id")) == active_id), None)
    if selected and (has_capability(selected, capability) or allow_temp_capability):
        return selected

    selected = next((item for item in configs if has_capability(item, capability)), None)
    if selected:
        return selected

    if allow_temp_capability:
        image_active_id = active_config_id(config_root, "img2img")
        return next((item for item in configs if clean_text(item.get("id")) == image_active_id), configs[0])

    raise RuntimeError(
        "No config declares {0}. Tick the capability in the provider panel, "
        "pass --config-id with --allow-temp-capability, or choose another capability.".format(capability)
    )


def validate_file(path, label):
    target = Path(path).expanduser()
    if not target.is_file():
        raise RuntimeError("{0} file does not exist: {1}".format(label, target))
    if target.stat().st_size <= 0:
        raise RuntimeError("{0} file is empty: {1}".format(label, target))
    return str(target.resolve())


def parse_reference_image_inputs(args):
    values = []
    if clean_text(args.reference_image):
        values.append(args.reference_image)
    for item in args.extra_reference_image or []:
        if clean_text(item):
            values.append(item)
    bulk = clean_text(args.reference_images)
    if bulk:
        parsed = None
        try:
            parsed = json.loads(bulk)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            values.extend(str(item) for item in parsed)
        else:
            values.extend(part.strip() for part in bulk.split(","))

    result = []
    for item in values:
        path = validate_file(item, "reference image")
        if path not in result:
            result.append(path)
    return result


def default_reference_roles(count):
    roles = ["person", "style", "scene", "prop"]
    return roles[:count] + ["reference"] * max(0, count - len(roles))


def parse_size(value):
    text = clean_text(value).lower()
    if "x" not in text:
        return None
    left, right = text.split("x", 1)
    try:
        width = int(left)
        height = int(right)
    except ValueError:
        return None
    if width <= 0 or height <= 0:
        return None
    return width, height


def png_dimensions(path):
    try:
        with Path(path).open("rb") as handle:
            header = handle.read(24)
        if header.startswith(b"\x89PNG\r\n\x1a\n") and len(header) >= 24:
            return int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big")
    except OSError:
        pass
    return None


def png_chunk(chunk_type, data):
    encoded_type = chunk_type.encode("ascii")
    return (
        struct.pack(">I", len(data))
        + encoded_type
        + data
        + struct.pack(">I", zlib.crc32(encoded_type + data) & 0xFFFFFFFF)
    )


def write_alpha_mask_png(path, width, height, alpha_at):
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            row.extend((0, 0, 0, alpha_at(x, y)))
        rows.append(bytes(row))
    data = b"".join(rows)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk("IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + png_chunk("IDAT", zlib.compress(data))
        + png_chunk("IEND", b"")
    )
    Path(path).write_bytes(png)


def create_inpaint_test_mask(source_image, image_size, output_dir, mask_rect=""):
    dimensions = png_dimensions(source_image) or parse_size(image_size) or (1024, 1024)
    width, height = dimensions
    left, top, right, bottom = resolve_mask_rect(mask_rect, width, height)
    target = Path(output_dir) / "auto-inpaint-mask.png"

    def alpha_at(x, y):
        return 0 if left <= x < right and top <= y < bottom else 255

    write_alpha_mask_png(target, width, height, alpha_at)
    return str(target.resolve())


def resolve_mask_rect(value, width, height):
    text = clean_text(value)
    if not text:
        left = width // 3
        right = width - left
        top = height // 3
        bottom = height - top
        return left, top, right, bottom

    parts = [part.strip() for part in text.split(",")]
    if len(parts) != 4:
        raise RuntimeError("--mask-rect must be x,y,width,height.")
    try:
        values = [float(part) for part in parts]
    except ValueError as error:
        raise RuntimeError("--mask-rect only accepts numbers.") from error

    if any(item < 0 for item in values):
        raise RuntimeError("--mask-rect values must be non-negative.")

    if all(item <= 1 for item in values):
        x, y, rect_width, rect_height = values
        left = round(x * width)
        top = round(y * height)
        right = round((x + rect_width) * width)
        bottom = round((y + rect_height) * height)
    else:
        x, y, rect_width, rect_height = values
        left = round(x)
        top = round(y)
        right = round(x + rect_width)
        bottom = round(y + rect_height)

    left = max(0, min(width - 1, left))
    top = max(0, min(height - 1, top))
    right = max(left + 1, min(width, right))
    bottom = max(top + 1, min(height, bottom))
    return left, top, right, bottom


def output_root(value):
    if value:
        root = Path(value).expanduser()
    else:
        stamp = time.strftime("%Y%m%d-%H%M%S")
        root = repo_root() / "output" / "real-provider-image-edit-smoke" / stamp
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def redact(value, key=""):
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        return {
            child_key: ("[redacted]" if SENSITIVE_KEY_PATTERN.search(child_key) else redact(child_value, child_key))
            for child_key, child_value in value.items()
        }
    if key and SENSITIVE_KEY_PATTERN.search(key):
        return "[redacted]"
    return value


def host_from_base_url(base_url):
    try:
        parsed = urlparse(str(base_url or ""))
        return parsed.netloc or parsed.path
    except Exception:
        return ""


def summarize_config(config):
    capabilities = normalize_capabilities(config.get("capabilities"))
    return {
        "id": clean_text(config.get("id")),
        "name": clean_text(config.get("name") or config.get("displayName")),
        "adapterId": clean_text(config.get("adapterId")),
        "host": host_from_base_url(config.get("baseUrl")),
        "model": clean_text(config.get("model")),
        "imageModel": clean_text(config.get("imageModel")),
        "nativeImageEdit": [
            capability
            for capability in CAPABILITIES
            if capability in capabilities or (capability in GPT_IMAGE_REFERENCE_CAPABILITIES and is_gpt_image_config(config))
        ],
        "imageFallback": "image" in capabilities or "txt2img" in capabilities,
    }


def print_config_summary(config_root):
    configs = get_model_configs(config_root)
    if not configs:
        print("No AI model configs found.")
        return
    for index, config in enumerate(configs, start=1):
        item = summarize_config(config)
        native = ",".join(item["nativeImageEdit"]) if item["nativeImageEdit"] else "-"
        fallback = "yes" if item["imageFallback"] else "no"
        print(
            "{index}. {name} | id={id} | host={host} | imageModel={imageModel} | nativeEdit={native} | imageFallback={fallback}".format(
                index=index,
                name=item["name"] or "-",
                id=item["id"] or "-",
                host=item["host"] or "-",
                imageModel=item["imageModel"] or item["model"] or "-",
                native=native,
                fallback=fallback,
            )
        )


def capability_prompt(capability, custom_prompt):
    if custom_prompt:
        return custom_prompt
    if capability in {"upscale_2x", "upscale_4x"}:
        scale = "4x" if capability == "upscale_4x" else "2x"
        return "Upscale the source image to {0} without changing the person, subject, composition, or scene.".format(scale)
    if capability == "img2img":
        return "Create a new polished variation from the reference image while preserving the main subject."
    if capability == "inpaint":
        return "Replace only the masked area with a clean natural result and keep the rest unchanged."
    return "Use the reference portrait as the identity source and create a new expression while preserving the same person."


def build_payload(config, capability, args, output_dir):
    run_config = dict(config)
    if args.allow_temp_capability and not has_capability(run_config, capability):
        run_config["capabilities"] = normalize_capabilities(
            [*(run_config.get("capabilities") or []), capability]
        )

    image_model = clean_text(run_config.get("imageModel") or run_config.get("model"))
    if image_model:
        run_config["model"] = clean_text(run_config.get("model") or image_model)
        run_config["imageModel"] = image_model

    timeout_ms = args.timeout_seconds * 1000 if args.timeout_seconds > 0 else int(run_config.get("timeoutMs") or 720000)
    run_config["timeoutMs"] = timeout_ms
    size = clean_text(args.size or run_config.get("imageSize") or "1024x1024")

    reference_images = parse_reference_image_inputs(args)
    source_image = clean_text(args.source_image)
    mask_image = clean_text(args.mask_image)

    options = {
        "size": size,
        "count": max(1, args.count),
        "fallbackMode": "native",
    }
    if clean_text(args.quality):
        options["quality"] = clean_text(args.quality)
    if clean_text(args.output_format):
        options["outputFormat"] = clean_text(args.output_format)
    if args.output_compression >= 0:
        if args.output_compression > 100:
            raise RuntimeError("--output-compression must be between 0 and 100.")
        options["outputCompression"] = args.output_compression
    if clean_text(args.background):
        options["background"] = clean_text(args.background)
    if clean_text(args.moderation):
        options["moderation"] = clean_text(args.moderation)
    if capability in {"img2img", "person_consistency"}:
        if not reference_images and source_image:
            reference_images = [validate_file(source_image, "reference image")]
        if not reference_images:
            raise RuntimeError("reference image file does not exist: <empty>")
        options["referenceImagePath"] = reference_images[0]
        if len(reference_images) > 1:
            options["referenceImagePaths"] = reference_images
        options["sourceImagePath"] = options["referenceImagePath"]
        if not clean_text(args.person_context_json):
            roles = default_reference_roles(len(reference_images))
            options["personContextJson"] = json.dumps(
                {
                    "sourceImagePath": options["sourceImagePath"],
                    "referenceImagePaths": reference_images,
                    "referenceRoles": [
                        {
                            "index": index + 1,
                            "role": roles[index],
                            "imagePath": path,
                            "source": "script",
                        }
                        for index, path in enumerate(reference_images)
                    ],
                    "promise": "best_effort_identity_consistency"
                    if capability == "person_consistency"
                    else "role_aware_reference_guidance",
                },
                ensure_ascii=False,
            )
    if capability == "inpaint":
        options["sourceImagePath"] = validate_file(source_image or (reference_images[0] if reference_images else ""), "source image")
        if not mask_image and (args.auto_mask or clean_text(args.mask_rect)):
            mask_image = create_inpaint_test_mask(
                options["sourceImagePath"],
                size,
                output_dir,
                args.mask_rect,
            )
        options["maskPath"] = validate_file(mask_image, "mask image")
    if capability in {"upscale_2x", "upscale_4x"}:
        options["sourceImagePath"] = validate_file(source_image or (reference_images[0] if reference_images else ""), "source image")
        options["scale"] = 4 if capability == "upscale_4x" else 2
    if capability == "person_consistency" and clean_text(args.person_context_json):
        options["personContextJson"] = clean_text(args.person_context_json)

    return {
        "config": run_config,
        "action": "image",
        "outputDir": str(output_dir),
        "requestId": "real-image-edit-{0}-{1}".format(capability, int(time.time() * 1000)),
        "generation": {
            "capability": capability,
            "prompt": capability_prompt(capability, args.prompt),
            "model": image_model,
            "options": options,
        },
    }


def run_sidecar(payload, timeout_seconds):
    script = repo_root() / "src-tauri" / "sidecars" / "python" / "ai_provider_tester.py"
    process = subprocess.run(
        [sys.executable, str(script)],
        input=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=repo_root(),
        timeout=timeout_seconds + 30,
    )
    stdout = (process.stdout or b"").decode("utf-8", errors="ignore")
    stderr = (process.stderr or b"").decode("utf-8", errors="ignore")
    try:
        result = json.loads(stdout or "{}")
    except json.JSONDecodeError:
        result = {
            "ok": False,
            "message": "Sidecar stdout is not JSON.",
            "rawPreview": stdout[:1000],
        }
    return process.returncode, result, stderr


def parse_raw_preview(result):
    preview = result.get("rawPreview")
    if not isinstance(preview, str) or not preview.strip():
        return None
    try:
        return json.loads(preview)
    except json.JSONDecodeError:
        return None


def collect_named_ints(value, target_key):
    matches = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key == target_key:
                try:
                    matches.append(int(item))
                except (TypeError, ValueError):
                    pass
            matches.extend(collect_named_ints(item, target_key))
    elif isinstance(value, list):
        for item in value:
            matches.extend(collect_named_ints(item, target_key))
    return matches


def result_image_token_count(result):
    parsed = parse_raw_preview(result)
    if parsed is None:
        return None
    counts = collect_named_ints(parsed, "image_tokens")
    return max(counts) if counts else None


def validate_real_provider_result(capability, payload, result):
    if not result.get("ok") or capability not in {"upscale_2x", "upscale_4x"}:
        return result

    image_token_count = result_image_token_count(result)
    validation = {
        "capability": capability,
        "sourceImagePath": payload.get("generation", {}).get("options", {}).get("sourceImagePath"),
        "imageTokenCount": image_token_count,
    }
    checked = dict(result)
    checked["providerValidation"] = validation

    if image_token_count == 0:
        checked["ok"] = False
        checked["failureKind"] = "source_image_not_used"
        checked["message"] = (
            "Provider returned an image, but reported image_tokens=0. "
            "The source image was not used, so this is not stable upscale."
        )
    return checked


def write_report(root, records):
    lines = [
        "# Real Provider Image Edit Smoke",
        "",
        "| Capability | OK | Status | Model | Host | Saved files | Message |",
        "| --- | --- | --- | --- | --- | ---: | --- |",
    ]
    for item in records:
        result = item["result"]
        lines.append(
            "| {capability} | {ok} | {status} | {model} | {host} | {saved} | {message} |".format(
                capability=item["capability"],
                ok="yes" if result.get("ok") else "no",
                status=result.get("statusCode") or "-",
                model=clean_text(result.get("model") or item.get("model")),
                host=item.get("host") or "-",
                saved=len(result.get("savedFiles") or []),
                message=clean_text(result.get("message")).replace("|", "/")[:220],
            )
        )
    (root / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_capability(config_root, capability, args, root):
    config = select_config(
        config_root,
        capability,
        args.config_id,
        allow_temp_capability=args.allow_temp_capability,
    )
    capability_dir = root / capability
    capability_dir.mkdir(parents=True, exist_ok=True)
    payload = build_payload(config, capability, args, capability_dir)
    timeout_seconds = max(3, int(payload["config"].get("timeoutMs") or 720000) // 1000)

    write_json(capability_dir / "request.sanitized.json", redact(payload))
    if args.preflight:
        result = {
            "ok": True,
            "action": "image",
            "model": payload["generation"].get("model"),
            "baseUrl": payload["config"].get("baseUrl"),
            "message": "Preflight passed. Real provider request was not sent.",
            "savedFiles": [],
        }
        write_json(capability_dir / "result.sanitized.json", redact(result))
        return {
            "capability": capability,
            "returnCode": 0,
            "host": host_from_base_url(payload["config"].get("baseUrl")),
            "model": payload["generation"].get("model"),
            "result": result,
        }

    return_code, result, stderr = run_sidecar(payload, timeout_seconds)
    result = validate_real_provider_result(capability, payload, result)
    write_json(capability_dir / "result.sanitized.json", redact(result))
    if stderr:
        (capability_dir / "stderr.txt").write_text(stderr[:4000], encoding="utf-8")

    return {
        "capability": capability,
        "returnCode": return_code,
        "host": host_from_base_url(payload["config"].get("baseUrl")),
        "model": payload["generation"].get("model"),
        "result": result,
    }


def main():
    try:
        args = parse_args()
        config_path = Path(args.config_path).expanduser() if args.config_path else default_config_path()
        config_root = read_json(config_path)
        if args.list_configs:
            print_config_summary(config_root)
            return 0
        if not args.preflight:
            require_real_smoke_enabled()
        root = output_root(args.out_dir)
        capabilities = CAPABILITIES if args.capability == "all" else (args.capability,)
        records = [run_capability(config_root, capability, args, root) for capability in capabilities]
        write_json(root / "summary.sanitized.json", redact(records))
        write_report(root, records)

        failed = [item for item in records if not item["result"].get("ok")]
        print("Real provider image edit smoke finished: {0}".format(root))
        for item in records:
            result = item["result"]
            print(
                "- {0}: {1}, saved={2}, host={3}, model={4}".format(
                    item["capability"],
                    "ok" if result.get("ok") else "failed",
                    len(result.get("savedFiles") or []),
                    item.get("host") or "-",
                    clean_text(result.get("model") or item.get("model")) or "-",
                )
            )
        return 1 if failed else 0
    except Exception as error:
        print("Real provider image edit smoke failed: {0}".format(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
