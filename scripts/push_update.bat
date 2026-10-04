@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "feat: add Zentropic Technologies company site in packages/company-site"
%GIT% push origin main
echo.
echo Push complete!
