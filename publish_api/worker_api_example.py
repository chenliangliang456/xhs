#!/usr/bin/env python3
"""
本地 Worker API 示例（独立文件，不改 app.py）

启动：
  python3 publish_api/worker_api_example.py

测试：
  打开 http://127.0.0.1:5000/
  POST /api/worker/enqueue 添加任务
  local_worker.py 会从 /api/worker/poll 拉任务，并回传到 /api/worker/report
"""

from datetime import datetime
from uuid import uuid4

from flask import Flask, jsonify, request


app = Flask(__name__)

pending_tasks = []
finished_tasks = []


@app.get("/")
def home():
    return jsonify(
        {
            "success": True,
            "message": "local worker api is running",
            "pending": len(pending_tasks),
            "finished": len(finished_tasks),
            "endpoints": [
                "GET /",
                "POST /api/worker/enqueue",
                "POST /api/worker/poll",
                "POST /api/worker/report",
            ],
        }
    )


@app.post("/api/worker/enqueue")
def enqueue():
    data = request.get_json(silent=True) or {}
    task = {
        "id": data.get("id") or str(uuid4()),
        "title": data.get("title") or "本地测试标题",
        "content": data.get("content") or "这是一条本地 Worker 测试任务",
        "images": data.get("images") or [],
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    pending_tasks.append(task)
    return jsonify({"success": True, "task": task})


@app.post("/api/worker/poll")
def poll():
    if not pending_tasks:
        return jsonify({"success": True, "task": None})
    task = pending_tasks.pop(0)
    task["pickedAt"] = datetime.utcnow().isoformat() + "Z"
    return jsonify({"success": True, "task": task})


@app.post("/api/worker/report")
def report():
    data = request.get_json(silent=True) or {}
    record = {
        "taskId": data.get("taskId"),
        "success": bool(data.get("success")),
        "message": data.get("message") or "",
        "payload": data.get("payload") or {},
        "reportedAt": datetime.utcnow().isoformat() + "Z",
    }
    finished_tasks.insert(0, record)
    return jsonify({"success": True, "record": record})


@app.get("/api/worker/results")
def results():
    return jsonify({"success": True, "data": finished_tasks})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)

