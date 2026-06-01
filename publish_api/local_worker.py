#!/usr/bin/env python3
"""
本地常驻 Worker（独立文件，不改现有代码）

用途：
1) 从 Vercel 后端拉取待发布任务
2) 在本机执行发布逻辑（可接入你现有 py 自动化）
3) 回传任务结果

环境变量（可选）：
- WORKER_BASE_URL: 例如 https://your-app.vercel.app
- WORKER_TOKEN: 简单鉴权 token（Header: X-Worker-Token）
- WORKER_POLL_PATH: 拉任务路径，默认 /api/worker/poll
- WORKER_REPORT_PATH: 回传路径，默认 /api/worker/report
- WORKER_INTERVAL_SEC: 无任务时轮询间隔，默认 5
"""

import os
import time
import traceback
from typing import Any, Dict, Optional

import requests


BASE_URL = os.getenv("WORKER_BASE_URL", "").rstrip("/")
TOKEN = os.getenv("WORKER_TOKEN", "")
POLL_PATH = os.getenv("WORKER_POLL_PATH", "/api/worker/poll")
REPORT_PATH = os.getenv("WORKER_REPORT_PATH", "/api/worker/report")
INTERVAL_SEC = int(os.getenv("WORKER_INTERVAL_SEC", "5"))


def headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    if TOKEN:
        h["X-Worker-Token"] = TOKEN
    return h


def fetch_task() -> Optional[Dict[str, Any]]:
    resp = requests.post(
        f"{BASE_URL}{POLL_PATH}",
        json={"worker": "local-python-worker"},
        headers=headers(),
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json() or {}
    if not data.get("success"):
        return None
    return data.get("task")


def report_result(task_id: str, success: bool, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
    body = {
        "taskId": task_id,
        "success": success,
        "message": message,
        "payload": payload or {},
    }
    resp = requests.post(
        f"{BASE_URL}{REPORT_PATH}",
        json=body,
        headers=headers(),
        timeout=20,
    )
    resp.raise_for_status()


def run_publish(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    你可以把这里替换成自己的发布实现：
    - Selenium / Playwright / 接口调用 / 半自动确认
    """
    title = task.get("title", "")
    content = task.get("content", "")
    images = task.get("images", [])

    # 先给一个最小可运行占位逻辑：链路验证通过后再接入真实发布
    time.sleep(1.5)
    return {
        "noteId": f"local_{int(time.time())}",
        "title": title,
        "contentLength": len(content),
        "imageCount": len(images),
    }


def main() -> None:
    if not BASE_URL:
        raise RuntimeError("请先设置 WORKER_BASE_URL，例如: https://xxx.vercel.app")

    print(f"[worker] started, base={BASE_URL}, poll={POLL_PATH}, report={REPORT_PATH}")

    while True:
        try:
            task = fetch_task()
            if not task:
                time.sleep(INTERVAL_SEC)
                continue

            task_id = str(task.get("id") or task.get("taskId") or "")
            if not task_id:
                time.sleep(1)
                continue

            print(f"[worker] got task: {task_id}")
            try:
                result = run_publish(task)
                report_result(task_id, True, "published", result)
                print(f"[worker] done: {task_id}")
            except Exception as e:
                report_result(
                    task_id,
                    False,
                    f"publish_failed: {e}",
                    {"traceback": traceback.format_exc()},
                )
                print(f"[worker] failed: {task_id} -> {e}")

        except Exception as e:
            print(f"[worker] loop error: {e}")
            time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()

