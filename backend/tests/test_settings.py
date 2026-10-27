import os

from app.settings import ALLOWED_KEYS, load_local_environment


def test_env_loader_handles_quotes_bom_and_only_documented_keys(tmp_path, monkeypatch):
    monkeypatch.setattr(os, "environ", dict(os.environ))
    for key in ALLOWED_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("KOVAN_UNDOCUMENTED", raising=False)
    (tmp_path / ".env").write_text(
        '# comment\nKOVAN_DATA_DIR="demo data"\nKOVAN_COOKIE_SECURE=false\n'
        "KOVAN_ALLOWED_ORIGINS='http://localhost:5173'\nKOVAN_UNDOCUMENTED=ignored\n",
        encoding="utf-8-sig",
    )
    load_local_environment(tmp_path)
    assert os.environ["KOVAN_DATA_DIR"] == "demo data"
    assert os.environ["KOVAN_COOKIE_SECURE"] == "false"
    assert os.environ["KOVAN_ALLOWED_ORIGINS"] == "http://localhost:5173"
    assert "KOVAN_UNDOCUMENTED" not in os.environ


def test_process_environment_takes_precedence_and_missing_env_is_optional(tmp_path, monkeypatch):
    monkeypatch.setenv("KOVAN_COOKIE_SECURE", "true")
    load_local_environment(tmp_path)
    (tmp_path / ".env").write_text("KOVAN_COOKIE_SECURE=false\n", encoding="utf-8")
    load_local_environment(tmp_path)
    assert os.environ["KOVAN_COOKIE_SECURE"] == "true"
