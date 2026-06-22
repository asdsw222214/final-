# 課表空堂媒合器 Free Time Matcher (Vue + Express + SQLite 版本)

本專案已重構成前後端分離架構，包含 Vue 3 前端、Express API 後端與 SQLite 本地資料庫。

## 專案 GitHub 儲存庫 (Repository)
* **儲存庫網址**: [asdsw222214/final-](https://github.com/asdsw222214/final-.git)

---

## 專案結構 `/project`

```
/project
  /server          ← Express 後端 (API Only)
    /data
      database.db  ← SQLite 資料庫檔案 (啟動服務後自動生成)
    database.js    ← 資料庫連線、表格初始化與 SQL 查詢邏輯
    server.js      ← Express 應用程式與 API 路由設定
    package.json
  /client          ← Vue 3 + Vite 前端
    /src
      /components  ← 各功能 Vue 單一文件元件 (SFC)
      /utils
        parser.js  ← 課表文字智慧解析工具
      App.vue      ← 主程式進入點 (路由判斷與資料輪詢同步)
      main.js      ← Vue 應用程式初始化
      index.css    ← 玻璃擬態與自訂 UI 樣式系統
    index.html
    vite.config.js
    package.json
```

---

## 技術說明與第三方參考來源

### 1. 限制使用技術
* **前端**：HTML5, Vanilla CSS3 (自訂設計系統與版面樣式), JavaScript (Vue 3 組合式 API).
* **後端**：Node.js, Express (API 服務).
* **資料庫**：SQLite (使用 `sqlite3` 本地檔案型資料庫).

### 2. 開源專案參考與引用說明
本專案的「網格課表視覺化展示」與「智慧課表文字解析」參考了 GitHub 上的開源專案 **[CITUCourseBuilder (by MasuRii)](https://github.com/MasuRii/CITUCourseBuilder)**：
* **網格時段表示法**：參考其將課表映射至二維網格（星期、節次）並利用色塊呈現課堂分佈與狀態的設計邏輯，將其延伸應用於全組員課表疊加的「空堂熱力圖」上。
* **課表文字解析概念**：參考其解析學生選課系統或時間段文字之實作概念，實作了本專案的 `parser.js`，智慧辨識星期（一至日）與時間區間（HH:mm 或節次代碼），藉此自動轉換為忙碌網格時段。

---

## 啟動與安裝指南

### 後端服務 (Server)
1. 進入 `server` 目錄：
   ```bash
   cd server
   ```
2. 安裝相依套件（包括 `express`、`cors`、`sqlite3`）：
   ```bash
   npm install
   ```
3. 啟動 Express API 伺服器（預設監聽 Port 3000）：
   ```bash
   npm start
   ```

### 前端服務 (Client)
1. 進入 `client` 目錄：
   ```bash
   cd client
   ```
2. 安裝相依套件（包括 `vue`、`vite`、`html2canvas`、`lucide-vue-next`）：
   ```bash
   npm install
   ```
3. 啟動 Vite 本地開發伺服器（預設代理 `/api` 請求至 Port 3000）：
   ```bash
   npm run dev
   ```
4. 開啟瀏覽器訪問 Vite 提供之本機網址即可開始使用。

---

## Git 提交與上傳儲存庫指南

如果您要在本機電腦上將重構後的 `/project` 資料夾推送到您的 GitHub 儲存庫（[asdsw222214/final-](https://github.com/asdsw222214/final-.git)），請按照以下步驟操作（需先在本機安裝 Git）：

1. **開啟終端機（Terminal / PowerShell）並進入 `/project` 資料夾**：
   ```bash
   cd project
   ```

2. **初始化本地 Git 儲存庫**：
   ```bash
   git init
   ```

3. **新增所有專案檔案至暫存區**：
   ```bash
   git add .
   ```

4. **提交變更**：
   ```bash
   git commit -m "feat: 重構為 Vue + Express + SQLite 前後端架構並優化熱力圖顏色"
   ```

5. **設定分支為 `main`**（建議）：
   ```bash
   git branch -M main
   ```

6. **關聯您的遠端 GitHub 儲存庫**：
   ```bash
   git remote add origin https://github.com/asdsw222214/final-.git
   ```

7. **推送至 GitHub**：
   ```bash
   git push -u origin main
   ```
   *(如果遠端儲存庫已經有初始化檔案且衝突，可使用 `git push -u origin main --force` 強制推送覆蓋，請確保備份)*
