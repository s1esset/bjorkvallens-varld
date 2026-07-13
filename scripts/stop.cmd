@echo off
REM Dubbelklicka for att stoppa Bjorkvallens Varld-servern (nuvarande + stale)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
