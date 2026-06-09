import argparse
import concurrent.futures
import json
import math
import subprocess
import sys
import threading
import time
from pathlib import Path


SIZES = [
    "1008x1792",
    "1008x1344",
    "1536x864",
    "1344x1008",
    "1024x1024",
    "2048x2048",
    "1152x2048",
    "2048x1152",
    "1536x2048",
    "2048x1536",
    "1344x2016",
    "2016x1344",
    "2000x1600",
    "1600x2000",
    "2000x1200",
    "1200x2000",
    "2048x1024",
    "1024x2048",
    "2048x1104",
    "2048x864",
    "2048x880",
    "880x2048",
    "2048x688",
    "688x2048",
    "2880x2880",
    "2160x3840",
    "3840x2160",
    "2160x2880",
    "2880x2160",
    "2304x3456",
    "3456x2304",
    "2880x2304",
    "2304x2880",
    "3600x2160",
    "2160x3600",
    "3840x1920",
    "1920x3840",
    "3840x2080",
    "3840x1616",
    "3840x1648",
    "1648x3840",
    "3840x1280",
    "1280x3840",
]

KNOWN_UNSUPPORTED_SIZES = {
    "3840x960",
    "960x3840",
    "3840x768",
    "768x3840",
    "3840x640",
    "640x3840",
    "7680x960",
    "960x7680",
    "7680x4320",
    "4320x7680",
    "7680x3840",
    "3840x7680",
    "7680x2560",
    "2560x7680",
    "7680x1920",
    "1920x7680",
    "7680x1280",
    "1280x7680",
    "7680x640",
    "640x7680",
    "7680x480",
    "480x7680",
    "7680x7680",
    "8192x4608",
    "4608x8192",
    "8192x8192",
}

EXPLICIT_RETEST_ONLY_SIZES = set()


def parse_args():
    parser = argparse.ArgumentParser(description="Run real gpt-image-2 generation tests for verified sizes.")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out-dir", default="")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--timeout-seconds", type=int, default=720)
    parser.add_argument("--base-url", default="http://localhost:4444/v1")
    parser.add_argument("--image-model", default="gpt-image-2")
    parser.add_argument("--only-sizes", default="", help="Comma-separated size list to test. Explicit values may include known unsupported sizes for retesting.")
    parser.add_argument("--skip-successes-from", default="", help="Existing results.json whose successful sizes should be skipped.")
    parser.add_argument("--cooldown-between-seconds", type=int, default=0)
    parser.add_argument("--cooldown-after-problem-seconds", type=int, default=0)
    return parser.parse_args()


def read_config(base_url, image_model):
    config_path = Path.home() / ".monster-tools" / "config.json"
    config_root = json.loads(config_path.read_text(encoding="utf-8-sig") or "{}")
    configs = config_root.get("aiModelConfigs") or []
    selected = next(
        (
            item
            for item in configs
            if item.get("baseUrl") == base_url
            and item.get("imageModel") == image_model
            and item.get("name") == image_model
        ),
        None,
    )
    if selected is None:
        selected = next(
            (
                item
                for item in configs
                if item.get("baseUrl") == base_url and item.get("imageModel") == image_model
            ),
            None,
        )
    if selected is None:
        raise RuntimeError(f"未找到 {base_url} / {image_model} 模型配置")
    return selected


def reduced_ratio(size):
    width, height = [int(item) for item in size.split("x")]
    gcd = math.gcd(width, height)
    return f"{width // gcd}:{height // gcd}"


def prompt_with_size(prompt, size):
    instruction = f"画幅要求：请严格按 {reduced_ratio(size)} 比例构图，参考尺寸 {size}，不要把比例或尺寸文字写进画面。"
    return f"{prompt}\n\n{instruction}"


def file_size(path):
    try:
        return Path(path).stat().st_size
    except OSError:
        return 0


def png_dimensions(path):
    try:
        with Path(path).open("rb") as handle:
            header = handle.read(24)
        if header.startswith(b"\x89PNG\r\n\x1a\n") and len(header) >= 24:
            width = int.from_bytes(header[16:20], "big")
            height = int.from_bytes(header[20:24], "big")
            return f"{width}x{height}"
    except OSError:
        pass
    return ""


def make_payload(base_config, prompt, size, output_dir, request_id, timeout_ms):
    config = dict(base_config)
    config.update(
        {
            "provider": config.get("provider") or "custom",
            "displayName": config.get("displayName") or config.get("name") or "gpt-image-2",
            "model": config.get("model") or config.get("imageModel") or "gpt-image-2",
            "imageModel": config.get("imageModel") or config.get("model") or "gpt-image-2",
            "imagePrompt": prompt_with_size(prompt, size),
            "imageSize": size,
            "timeoutMs": timeout_ms,
            "queueMode": config.get("queueMode") or "serial",
            "maxConcurrency": config.get("maxConcurrency") or 3,
        }
    )
    return {
        "config": config,
        "action": "image",
        "outputDir": str(output_dir),
        "requestId": request_id,
    }


def run_one(base_config, prompt, root_dir, size, index, total, timeout_seconds):
    size_dir = root_dir / "images" / f"{index:02d}-{size}"
    size_dir.mkdir(parents=True, exist_ok=True)
    request_id = f"size-{index:02d}-{size}-{int(time.time() * 1000)}"
    payload = make_payload(base_config, prompt, size, size_dir, request_id, timeout_seconds * 1000)
    started_at = time.strftime("%Y-%m-%d %H:%M:%S")
    started = time.perf_counter()
    stdout = ""
    stderr = ""
    process_return_code = None
    result = {}
    timed_out = False

    try:
        process = subprocess.run(
            [sys.executable, "src-tauri/sidecars/python/ai_provider_tester.py"],
            input=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            capture_output=True,
            timeout=timeout_seconds + 20,
        )
        process_return_code = process.returncode
        stdout = (process.stdout or b"").decode("utf-8", errors="ignore")
        stderr = (process.stderr or b"").decode("utf-8", errors="ignore")
        try:
            result = json.loads(stdout or "{}")
        except json.JSONDecodeError:
            result = {"ok": False, "message": "sidecar stdout 非 JSON", "rawPreview": stdout[:500]}
    except subprocess.TimeoutExpired as error:
        timed_out = True
        stdout = (error.stdout or b"").decode("utf-8", errors="ignore") if error.stdout else ""
        stderr = (error.stderr or b"").decode("utf-8", errors="ignore") if error.stderr else ""
        result = {"ok": False, "message": f"超过 {timeout_seconds} 秒未完成，已判定超时"}

    elapsed_seconds = round(time.perf_counter() - started, 2)
    saved_files = result.get("savedFiles") or []
    first_path = saved_files[0].get("path") if saved_files else ""
    ok = bool(result.get("ok"))
    saved_count = len(saved_files)
    message = result.get("message") or ""
    actual_image_size = result.get("actualImageSize") or ""
    api_image_size = result.get("apiImageSize") or ""
    first_file_dimensions = png_dimensions(first_path) if first_path else ""
    returned_dimensions = first_file_dimensions or actual_image_size
    strict_size_match = ok and returned_dimensions == size
    has_image = ok and (saved_count > 0 or result.get("imageUrls"))
    completion_percent = 100 if strict_size_match else 70 if has_image else 0
    is_timeout = timed_out or "timed out" in message.lower() or "超时" in message
    status = "success" if strict_size_match else "size_mismatch" if has_image else "timeout" if is_timeout else "failed"

    return {
        "index": index,
        "total": total,
        "size": size,
        "status": status,
        "completionPercent": completion_percent,
        "ok": ok,
        "elapsedSeconds": elapsed_seconds,
        "startedAt": started_at,
        "finishedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "processReturnCode": process_return_code,
        "requestId": result.get("requestId") or request_id,
        "message": message,
        "apiImageSize": api_image_size,
        "requestedImageSize": result.get("requestedImageSize") or size,
        "actualImageSize": actual_image_size,
        "fallbackImageSize": result.get("fallbackImageSize") or "",
        "imageAttempts": result.get("imageAttempts") or 0,
        "failureKind": result.get("failureKind") or ("timeout" if is_timeout else ""),
        "strictSizeMatch": strict_size_match,
        "savedFileCount": saved_count,
        "firstSavedFile": first_path,
        "firstSavedFileBytes": file_size(first_path) if first_path else 0,
        "firstSavedFileDimensions": first_file_dimensions,
        "stderrPreview": stderr[:500],
    }


def write_reports(root_dir, results, total):
    sorted_results = sorted(results, key=lambda item: item["index"])
    (root_dir / "results.json").write_text(
        json.dumps(sorted_results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    lines = [
        "# AI 生图尺寸真实测试报告",
        "",
        f"- 总尺寸数：{total}",
        f"- 已完成：{len(sorted_results)}",
        f"- 严格尺寸成功：{sum(1 for item in sorted_results if item['status'] == 'success')}",
        f"- 返回尺寸不一致：{sum(1 for item in sorted_results if item['status'] == 'size_mismatch')}",
        f"- 失败：{sum(1 for item in sorted_results if item['status'] == 'failed')}",
        f"- 超时：{sum(1 for item in sorted_results if item['status'] == 'timeout')}",
        f"- 已确认不支持且默认不测：{', '.join(sorted(KNOWN_UNSUPPORTED_SIZES))}",
        f"- 仅显式复测候选：{', '.join(sorted(EXPLICIT_RETEST_ONLY_SIZES))}",
        "",
        "| # | 尺寸 | 状态 | 完成度 | 耗时 | 失败类型 | API尺寸 | 返回尺寸 | 文件尺寸 | 尝试 | 文件 | 说明 |",
        "|---:|---|---|---:|---:|---|---|---|---|---:|---|---|",
    ]
    for item in sorted_results:
        file_name = Path(item["firstSavedFile"]).name if item["firstSavedFile"] else ""
        message = str(item["message"]).replace("|", "/").replace("\n", " ")[:80]
        lines.append(
            "| {index} | {size} | {status} | {completionPercent}% | {elapsedSeconds}s | {failureKind} | {apiImageSize} | {actualImageSize} | {fileDimensions} | {imageAttempts} | {file} | {message} |".format(
                index=item["index"],
                size=item["size"],
                status=item["status"],
                completionPercent=item["completionPercent"],
                elapsedSeconds=item["elapsedSeconds"],
                failureKind=item.get("failureKind") or "",
                apiImageSize=item["apiImageSize"],
                actualImageSize=item["actualImageSize"],
                fileDimensions=item.get("firstSavedFileDimensions") or "",
                imageAttempts=item["imageAttempts"],
                file=file_name,
                message=message,
            )
        )
    (root_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def append_result(root_dir, progress_path, results, item, total):
    results.append(item)
    with progress_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    write_reports(root_dir, results, total)
    print(json.dumps({"event": "done", **item}, ensure_ascii=False), flush=True)


def should_cool_down(item):
    if item.get("status") != "success":
        return True
    return item.get("firstSavedFileDimensions") != item.get("requestedImageSize")


def main():
    args = parse_args()
    workers = max(1, min(args.workers, 3))
    root_dir = Path(args.out_dir) if args.out_dir else Path.home() / ".monster-tools" / "ai" / "size-tests" / time.strftime("%Y%m%d-%H%M%S-batch")
    root_dir.mkdir(parents=True, exist_ok=True)
    (root_dir / "prompt.txt").write_text(args.prompt, encoding="utf-8")
    progress_path = root_dir / "progress.jsonl"
    base_config = read_config(args.base_url, args.image_model)
    sizes = SIZES
    if args.only_sizes.strip():
        requested_sizes = [item.strip() for item in args.only_sizes.split(",") if item.strip()]
        configured = set(SIZES) | KNOWN_UNSUPPORTED_SIZES | EXPLICIT_RETEST_ONLY_SIZES
        sizes = [size for size in requested_sizes if size in configured]
    if args.skip_successes_from.strip():
        existing_path = Path(args.skip_successes_from)
        existing_results = json.loads(existing_path.read_text(encoding="utf-8") or "[]")
        successful_sizes = {
            item.get("size")
            for item in existing_results
            if item.get("status") == "success" and item.get("completionPercent") == 100
        }
        sizes = [size for size in sizes if size not in successful_sizes]
    total = len(sizes)
    results = []
    lock = threading.Lock()

    print(json.dumps({"event": "start", "outDir": str(root_dir), "total": total, "workers": workers}, ensure_ascii=False), flush=True)
    if workers == 1:
        for index, size in enumerate(sizes, start=1):
            item = run_one(base_config, args.prompt, root_dir, size, index, total, args.timeout_seconds)
            append_result(root_dir, progress_path, results, item, total)
            if index < total and args.cooldown_between_seconds > 0:
                time.sleep(args.cooldown_between_seconds)
            if index < total and args.cooldown_after_problem_seconds > 0 and should_cool_down(item):
                time.sleep(args.cooldown_after_problem_seconds)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(run_one, base_config, args.prompt, root_dir, size, index, total, args.timeout_seconds)
                for index, size in enumerate(sizes, start=1)
            ]
            for future in concurrent.futures.as_completed(futures):
                item = future.result()
                with lock:
                    append_result(root_dir, progress_path, results, item, total)

    write_reports(root_dir, results, total)
    print(json.dumps({"event": "finish", "outDir": str(root_dir), "total": total}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
