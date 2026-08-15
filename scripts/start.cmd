@echo off
REM Dubbelklicka for att starta den LOKALA servern (bygg + preview pa :4173).
REM Till telefonen: npm run deploy -> https://s1esset.github.io/bjorkvallens-varld/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
