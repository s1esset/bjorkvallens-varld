@echo off
REM Dubbelklicka for att starta Bjorkvallens Varld-servern (bygg + preview + Tailscale)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
