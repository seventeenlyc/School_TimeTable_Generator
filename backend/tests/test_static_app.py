from fastapi.testclient import TestClient

from server import create_app


def test_static_app_serves_spa_and_assets(tmp_path):
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    index_html = dist_dir / "index.html"
    unique_text = "UNIQUE_SPA_INDEX_MARKER_TEST_12345"
    index_html.write_text(f"<!doctype html><html><body><div id='app'>{unique_text}</div></body></html>", encoding="utf-8")

    app_js = assets_dir / "app.js"
    js_content = "console.log('spa bundle test');"
    app_js.write_text(js_content, encoding="utf-8")

    data_path = tmp_path / "data.json"
    app = create_app(data_path, frontend_dist=dist_dir)
    client = TestClient(app)

    # GET /api/state 仍返回 200 JSON，证明 API 路由不被静态挂载遮蔽
    api_resp = client.get("/api/state")
    assert api_resp.status_code == 200
    assert "revision" in api_resp.json()

    # GET /api/does-not-exist 返回 404 且不含 SPA marker
    not_found_api_resp = client.get("/api/does-not-exist")
    assert not_found_api_resp.status_code == 404
    assert unique_text not in not_found_api_resp.text

    # GET / 返回 200 且包含 index 唯一文本
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    assert unique_text in root_resp.text

    # GET /assets/app.js 返回 200 且内容正确
    asset_resp = client.get("/assets/app.js")
    assert asset_resp.status_code == 200
    assert asset_resp.text == js_content

    # GET /catalog 这类 SPA 客户端路由返回同一个 index.html，支持刷新页面
    spa_resp = client.get("/catalog")
    assert spa_resp.status_code == 200
    assert unique_text in spa_resp.text


def test_static_app_when_dist_not_found(tmp_path):
    data_path = tmp_path / "data.json"
    non_existent_dist = tmp_path / "non_existent_dist"

    app = create_app(data_path, frontend_dist=non_existent_dist)
    client = TestClient(app)

    # API 仍能启动且 /api/state 正常
    api_resp = client.get("/api/state")
    assert api_resp.status_code == 200
    assert "revision" in api_resp.json()

    # GET / 返回 404（不要让测试环境因无前端构建产物崩溃）
    root_resp = client.get("/")
    assert root_resp.status_code == 404
