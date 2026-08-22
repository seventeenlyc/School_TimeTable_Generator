from pathlib import Path


def test_start_local_bat_line_endings_and_content():
    # Locate start-local.bat at repo root (two levels up from backend/tests/)
    repo_root = Path(__file__).resolve().parent.parent.parent
    bat_path = repo_root / "start-local.bat"

    assert bat_path.exists(), f"Launcher file not found: {bat_path}"

    content = bat_path.read_bytes()

    # 1. Non-empty and no UTF-8 BOM
    assert len(content) > 0, "start-local.bat must not be empty"
    assert not content.startswith(b"\xef\xbb\xbf"), "start-local.bat must not start with UTF-8 BOM"

    # 2. Every LF must belong to CRLF (no standalone LF after removing CRLF)
    remaining_lf = content.replace(b"\r\n", b"")
    standalone_lf_count = remaining_lf.count(b"\n")
    assert b"\n" not in remaining_lf, (
        f"start-local.bat contains standalone LF line endings ({standalone_lf_count} found). "
        "Windows cmd.exe requires CRLF line endings to prevent parsing corruption."
    )

    # 3. At least one CRLF
    assert b"\r\n" in content, "start-local.bat must contain at least one CRLF line ending"

    # 4. ASCII command powershell.exe -NoProfile -ExecutionPolicy Bypass exists
    assert b"powershell.exe -NoProfile -ExecutionPolicy Bypass" in content, (
        "start-local.bat must contain command: powershell.exe -NoProfile -ExecutionPolicy Bypass"
    )


def test_start_local_ps1_encoding_and_content():
    repo_root = Path(__file__).resolve().parent.parent.parent
    ps1_path = repo_root / "start-local.ps1"

    assert ps1_path.exists(), f"Launcher file not found: {ps1_path}"

    content = ps1_path.read_bytes()

    # 1. Non-empty and contains non-ASCII bytes (Chinese characters)
    assert len(content) > 0, "start-local.ps1 must not be empty"
    assert any(b > 127 for b in content), "start-local.ps1 must contain non-ASCII bytes"

    # 2. Must start with UTF-8 BOM (\xef\xbb\xbf) for Windows PowerShell 5.1 compatibility
    assert content.startswith(b"\xef\xbb\xbf"), (
        "start-local.ps1 must start with UTF-8 BOM (\\xef\\xbb\\xbf). "
        "Windows PowerShell 5.1 requires BOM for UTF-8 encoded scripts containing non-ASCII/Chinese characters to prevent ParserError."
    )

    # 3. Decodes successfully with utf-8-sig and contains required tokens
    decoded_text = content.decode("utf-8-sig")
    assert "ErrorActionPreference" in decoded_text, "start-local.ps1 must contain ErrorActionPreference"
    assert "uvicorn" in decoded_text, "start-local.ps1 must contain uvicorn"

