# -*- coding: utf-8 -*-
"""把 dist/win-unpacked 打成发布用的 zip，剔除所有不该分发的文件。

用法：python scripts/pack-release.py 1.4.0
产出：dist/TicketEditor-v1.4.0-win64.zip
"""
import os
import sys
import time
import zipfile

SRC = os.path.join("dist", "win-unpacked")

# 整目录排除
SKIP_DIRS = {
    "userdata",          # Electron 便携模式缓存（Chromium 缓存 + Local Storage）
    "__pycache__",       # 字节码缓存
}
# 相对 resources/ 的文件排除：运行期用户数据，含本机路径与个人资料
USER_DATA_PREFIX = os.path.join("resources", "ticketeditor")
USER_DATA_KEEP = {"ad_presets.json"}


def should_skip_file(rel_path):
    low = rel_path.lower().replace("\\", "/")
    if low.endswith(".bak") or low.endswith(".log"):
        return True
    # 只跳过根目录下的发布包自身，不能误伤 resources/python/python314.zip（运行时标准库）
    if "/" not in low and low.endswith(".zip"):
        return True
    if low.startswith("resources/ticketeditor/"):
        return os.path.basename(rel_path) not in USER_DATA_KEEP
    return False


def main():
    version = sys.argv[1] if len(sys.argv) > 1 else "1.4.0"
    # 用 ASCII 文件名：GitHub Release 会上传时丢掉中文，导致附件名残缺
    out = os.path.abspath(os.path.join("dist", "TicketEditor-v%s-win64.zip" % version))
    src = os.path.abspath(SRC)

    if not os.path.isdir(src):
        print("[!] 找不到 " + src + "，请先 npm run build")
        return 1
    if os.path.exists(out):
        os.remove(out)

    t0, n, skipped, skipped_sample = time.time(), 0, 0, []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for root, dirs, files in os.walk(src):
            dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS]
            for f in files:
                p = os.path.join(root, f)
                rel = os.path.relpath(p, src)
                if os.path.abspath(p) == out or should_skip_file(rel):
                    skipped += 1
                    if len(skipped_sample) < 5:
                        skipped_sample.append(rel)
                    continue
                try:
                    z.write(p, rel)
                    n += 1
                except OSError as e:
                    skipped += 1
                    print("  跳过（占用）%s: %s" % (rel, e.strerror))

    size = os.path.getsize(out) / 1048576
    print("打包完成：%d 个文件，跳过 %d 个，用时 %.0fs" % (n, skipped, time.time() - t0))
    if skipped_sample:
        print("  跳过示例：" + ", ".join(skipped_sample))
    print("输出：%s（%.1f MB）" % (out, size))
    return 0


if __name__ == "__main__":
    sys.exit(main())
