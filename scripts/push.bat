@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% config user.name "Mubeen Qazi"
%GIT% config user.email "mubeenqazi@gmail.com"
%GIT% branch -M main
%GIT% add -A
%GIT% commit -m "Initial commit: Complete MARTPOS Cloud Web App and SaaS Multi-Counter system"
%GIT% remote remove origin >nul 2>&1
%GIT% remote add origin https://x-access-token:%1@github.com/MubeenQazi6/Mart_POS_System.git
%GIT% push -u origin main --force
