import base64
import binascii
import ipaddress
import os
import socket
import urllib.parse
import urllib.request
import uuid


def read_positive_int_env(name, default):
    try:
        value = int(os.environ.get(name) or "")
        if value > 0:
            return value
    except Exception:
        pass
    return default


MAX_IMAGE_RESPONSE_BYTES = read_positive_int_env("AI_PROVIDER_MAX_IMAGE_RESPONSE_BYTES", 192 * 1024 * 1024)
MAX_DECODED_IMAGE_BYTES = read_positive_int_env("AI_PROVIDER_MAX_DECODED_IMAGE_BYTES", 96 * 1024 * 1024)
MAX_IMAGE_DOWNLOAD_TIMEOUT_SECONDS = read_positive_int_env("AI_PROVIDER_IMAGE_DOWNLOAD_TIMEOUT_SECONDS", 60)
MAX_IMAGE_ITEMS = 4
MAX_IMAGE_URL_CHARS = 2048


def is_local_url(url):
    clean = (url or "").lower()
    return clean.startswith("http://127.0.0.1") or clean.startswith("http://localhost")


def is_restricted_host(hostname):
    clean = (hostname or "").strip().lower().strip("[]")
    if not clean:
        return True
    if clean in ("localhost",):
        return True

    try:
        ip = ipaddress.ip_address(clean)
        return ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    except ValueError:
        pass

    try:
        for family, _, _, _, sockaddr in socket.getaddrinfo(clean, None):
            if family not in (socket.AF_INET, socket.AF_INET6):
                continue
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
                return True
    except Exception:
        return True

    return False


def is_safe_image_url(url, provider_base_url):
    parsed = urllib.parse.urlparse(str(url or ""))
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    if parsed.username or parsed.password:
        return False
    if is_local_url(provider_base_url):
        return True
    return not is_restricted_host(parsed.hostname)


def ensure_output_dir(output_dir):
    if not output_dir:
        return None
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def guess_extension(content_type, fallback=".png"):
    content_type = (content_type or "").lower()
    if "jpeg" in content_type or "jpg" in content_type:
        return ".jpg"
    if "webp" in content_type:
        return ".webp"
    if "gif" in content_type:
        return ".gif"
    if "png" in content_type:
        return ".png"
    return fallback


def mime_from_extension(ext):
    ext = (ext or "").lower()
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    if ext == ".gif":
        return "image/gif"
    return "image/png"


def png_dimensions_from_bytes(data):
    if len(data) >= 24 and data.startswith(b"\x89PNG\r\n\x1a\n"):
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        if width > 0 and height > 0:
            return "{0}x{1}".format(width, height)
    return ""


def jpeg_dimensions_from_bytes(data):
    if len(data) < 4 or not data.startswith(b"\xff\xd8"):
        return ""
    index = 2
    while index + 9 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        index += 2
        if marker in (0xD8, 0xD9):
            continue
        if index + 2 > len(data):
            break
        segment_length = int.from_bytes(data[index:index + 2], "big")
        if segment_length < 2 or index + segment_length > len(data):
            break
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height = int.from_bytes(data[index + 3:index + 5], "big")
            width = int.from_bytes(data[index + 5:index + 7], "big")
            if width > 0 and height > 0:
                return "{0}x{1}".format(width, height)
        index += segment_length
    return ""


def image_dimensions_from_bytes(data):
    return png_dimensions_from_bytes(data) or jpeg_dimensions_from_bytes(data)


def save_bytes(output_dir, data, ext, mime_type=None):
    if len(data) > MAX_DECODED_IMAGE_BYTES:
        raise RuntimeError("图片内容超过 {0} MB，请降低图片尺寸".format(MAX_DECODED_IMAGE_BYTES // 1024 // 1024))
    target_dir = ensure_output_dir(output_dir)
    if not target_dir:
        return None
    file_name = "ai-image-{0}{1}".format(uuid.uuid4().hex, ext)
    target_path = os.path.join(target_dir, file_name)
    with open(target_path, "wb") as file:
        file.write(data)
    dimensions = image_dimensions_from_bytes(data)
    return {
        "path": target_path,
        "sizeBytes": len(data),
        "mimeType": mime_type or mime_from_extension(ext),
        "dimensions": dimensions or None
    }


def save_base64_image(output_dir, value):
    b64_value = str(value)
    if "," in b64_value and b64_value.startswith("data:"):
        header, b64_value = b64_value.split(",", 1)
        ext = ".jpg" if "jpeg" in header or "jpg" in header else ".webp" if "webp" in header else ".png"
    else:
        ext = ".png"
    try:
        decoded_size = (len(b64_value.rstrip("=")) * 3) // 4
        if decoded_size > MAX_DECODED_IMAGE_BYTES:
            raise RuntimeError("图片内容超过 {0} MB，请降低图片尺寸".format(MAX_DECODED_IMAGE_BYTES // 1024 // 1024))
        data = base64.b64decode(b64_value, validate=True)
    except binascii.Error as error:
        raise RuntimeError("图片 Base64 数据格式不合法: {0}".format(error))
    return save_bytes(output_dir, data, ext, mime_from_extension(ext))


def download_image_to_file(output_dir, url, timeout):
    request = urllib.request.Request(url, method="GET")
    download_timeout = min(max(timeout, 3), MAX_IMAGE_DOWNLOAD_TIMEOUT_SECONDS)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if is_local_url(url) else None
    open_url = opener.open if opener else urllib.request.urlopen
    with open_url(request, timeout=download_timeout) as response:
        content_type = response.headers.get("Content-Type", "")
        content_length = int(response.headers.get("Content-Length", "0") or "0")
        if content_length > MAX_IMAGE_RESPONSE_BYTES:
            raise RuntimeError("图片响应体超过 {0} MB，请降低图片尺寸或改用较小图片".format(MAX_IMAGE_RESPONSE_BYTES // 1024 // 1024))
        data = response.read(MAX_IMAGE_RESPONSE_BYTES + 1)
        if len(data) > MAX_IMAGE_RESPONSE_BYTES:
            raise RuntimeError("图片响应体超过 {0} MB，请降低图片尺寸或改用较小图片".format(MAX_IMAGE_RESPONSE_BYTES // 1024 // 1024))
        return save_bytes(output_dir, data, guess_extension(content_type), content_type or None)


def parse_images(payload, output_dir, timeout, provider_base_url):
    urls = []
    paths = []
    saved_files = []
    for item in (payload.get("data") or [])[:MAX_IMAGE_ITEMS]:
        if not isinstance(item, dict):
            continue
        if item.get("url"):
            url = str(item["url"])
            if len(url) > MAX_IMAGE_URL_CHARS:
                continue
            if not is_safe_image_url(url, provider_base_url):
                continue
            try:
                saved_path = download_image_to_file(output_dir, url, timeout)
                if saved_path:
                    paths.append(saved_path["path"])
                    saved_files.append(saved_path)
                else:
                    urls.append(url)
            except Exception:
                urls.append(url)
        elif item.get("b64_json"):
            try:
                saved_path = save_base64_image(output_dir, item["b64_json"])
                if saved_path:
                    paths.append(saved_path["path"])
                    saved_files.append(saved_path)
            except Exception:
                continue
    return urls, paths, saved_files


def first_saved_file_dimensions(saved_files):
    for item in saved_files or []:
        dimensions = item.get("dimensions") if isinstance(item, dict) else None
        if dimensions:
            return dimensions
    return ""


def saved_file_to_artifact(kind, saved_file, duration_seconds=None):
    return {
        "kind": kind,
        "url": None,
        "path": saved_file.get("path") if isinstance(saved_file, dict) else None,
        "mimeType": saved_file.get("mimeType") if isinstance(saved_file, dict) else None,
        "sizeBytes": saved_file.get("sizeBytes") if isinstance(saved_file, dict) else None,
        "dimensions": saved_file.get("dimensions") if isinstance(saved_file, dict) else None,
        "durationSeconds": duration_seconds,
    }
