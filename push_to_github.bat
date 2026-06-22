@echo off
chcp 65001 > nul
echo ==========================================
echo   正在準備將專案上傳至 GitHub 儲存庫
echo ==========================================
echo.

rem 檢查是否安裝 git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 偵測到您的電腦尚未安裝 Git。
    echo 請前往以下網址下載並安裝 Git：
    echo 網址: https://git-scm.com/downloads
    echo.
    echo 安裝完成後，請重新執行此檔案！
    echo.
    pause
    exit /b
)

echo [1/5] 初始化本地 Git 儲存庫...
git init

echo [2/5] 新增檔案到暫存區...
git add .

echo [3/5] 提交變更...
git commit -m "feat: 重構為 Vue + Express + SQLite 前後端架構並優化熱力圖顏色"

echo [4/5] 設定分支為 main...
git branch -M main

echo [5/5] 關聯遠端儲存庫...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/asdsw222214/final-.git

echo.
echo ==========================================
echo   即將進行推送 (git push)。
echo   如果這是您第一次上傳，瀏覽器將彈出視窗
echo   要求您登入 GitHub 進行驗證。
echo ==========================================
echo.
git push -u origin main --force

echo.
echo 上傳完成！
pause
