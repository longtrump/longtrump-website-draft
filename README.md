# LTG 隆電 — GitHub Pages 草稿預覽

這是隆電（公司中文名稱 **隆電**）形象網站的靜態設計提案，五頁、無建置流程。GitHub Pages 從 `main` 分支**根目錄**發布。

**草稿預覽（不是正式官網）：** https://longtrump.github.io/longtrump-website-draft/

正式網域 longtrump.com.tw、DNS 與網域設定都不在這個倉庫裡。合併後預覽站才會換成這版首頁。

Pages 現況：來源為 `main` / `/`，沒有 CNAME、沒有自訂網域。根目錄的 `.nojekyll` 讓 Pages 略過 Jekyll，直接提供這些 HTML、CSS、JS 與圖片。

路徑都是相對的（`assets/…`、`images/…`、`index.html` 等），沒有 `<base href>`。在專案站路徑 `/longtrump-website-draft/` 下這樣就能解析，不必再加 base。請從結尾有斜線的預覽網址，或從 `index.html` 等檔名進入。

```
index.html        首頁
brands.html       產品線
rochester.html    Rochester 查詢
about.html        關於隆電
contact.html      聯絡我們
assets/           樣式、腳本、favicon、公司 logo
images/           主視覺與橫幅圖
```

下面是設計包原本的說明。其中提到的 `shots/` 與 `tools/` 是本機稽核用，沒有放進這個 Pages 倉庫。

---

# LTG 隆電 — 形象網站（設計提案）

靜態網站，五頁，無建置流程。直接用瀏覽器打開 `index.html` 即可。

```
index.html        首頁（主視覺、定位、能力、產品線、應用工程、品質、據點、CTA）
brands.html       產品線（五條線 + Rochester 查詢入口 + 11 個代理品牌總表）
rochester.html    Rochester 查詢頁（Search Engine、16 欄結果、精選料號、原廠簡介）
about.html        關於隆電（簡介、信念、沿革、組織分工、據點）
contact.html      聯絡我們（總部資訊、Google 地圖、據點、需求表單）
assets/css/style.css     設計系統（色彩、字體、8pt 間距、元件、RWD）
assets/js/main.js        header 狀態、行動版選單、進場動畫、表單示範
assets/js/rochester.js   Rochester 查詢：打 API、客製報價、渲染 16 欄結果表
assets/favicon.svg       LT 字標 favicon
assets/logo-ltg-light.png  公司 logo（奶油字版，深色底用）
assets/logo-ltg.png        公司 logo（原色版，淺色底用）
images/                  六張主視覺（Gemini 生成，1024×572）
shots/                   版面驗證截圖（桌面／平板／手機）
tools/                   audit.mjs（版面／資源稽核）、checks.mjs（對比與導覽檢查）、rl-check.mjs（Rochester 查詢）
```

## 設計方向（2026-10 美術方向 A：晶圓廠技術文件）

- 顏色：深海藍 `#0c1725` + 骨白 `#f5efe3`，訊號紅 `#d21f2b`（取自 logo）只用在主要動作與一個資料重點
- 字體：標題 Noto Serif TC，內文 Noto Sans TC；五級字 13 / 17 / 20 / 40 / 70（small / body / lead / section / display）
- 間距：8pt 網格（`--s-1` … `--s-20`），大量留白
- 圖像：真實材質微距（晶圓、模組、感測器、電池、倉儲、實驗室），不用握手圖庫照
- 版面：首屏只留一個主體（H1＋一個 CTA）；Rochester 查詢頁把搜尋框放進首屏\n- 記憶點：首頁「一顆料的履歷」— 用 LM358ADR2G 的即時資料做成一張技術資料卡，連到 16 欄查詢頁
- 動效：只做「進場」、hover 與 hero 極慢縮放，尊重 `prefers-reduced-motion`
- 無障礙：跳至主要內容、可見 focus、AA 對比、圖片 alt、單一 h1

## 內容來源（Notion 公司知識庫）

- 網站改版 brief（視覺語言、目標受眾、設計原則）
- 組織架構（集團據點、BU 分工、代理品牌）
- ISO 9001 驗證與管理審查（品質政策「學習、創新、績效」、驗證範圍、2002 首證）
- BU1／BU2／BU3 產品線、FAE 與倉儲作業
- 資訊服務與帳號（Email 網域 longtrump.com.tw）

## Rochester 查詢頁（原廠要求，結果欄位固定）

`rochester.html` 是依照原官網 Rochester 查詢頁（`412-1604-19118.php`）重做的版本，資料源與原頁完全相同：

```
GET https://4j91yv4ms6.execute-api.us-east-1.amazonaws.com/fetch?key=<料號或前綴>
```

### 輸出欄位（固定 16 欄，不可改）

`Part Number`、`ECCN`、`Rohs Available`、`Price: 1 To 24`、`Price: 25 To 99`、`Price: 100 To 499`、`Price: 500 To 999`、`Price: 1000 To 9999`、`Price: 10000 To 99999`、`Prices: Over`、`Manufacturer Code`、`PB Free Available`、`Total QTY`、`Date Code`、`Notes`、`Qty`

- 每一列 = 一個批號（`date_codes[]` 的一筆），同一料號會重複多列；API 回傳順序不重排、不合併、不過濾 `qty = 0`。
- `Date Code` 只取原字串前兩碼（年份，例如 `2244` → `22`）。
- `Prices: Over` 固定連到 `contact.html`（原頁為 Contact Us）。
- 空白 = 該料號的價格級距不適用（高價料只有 4 段、中價 6 段、低價 7 段）。

### 客製化報價（不是原廠牌價）

原頁以 `sales_manager_price` 當成本，套自訂毛利換算成隆電報價，公式已照原頁 1:1 移植：

```
報價 = 成本 ÷ (1 − 毛利%)        // 低於 1 美元：55/50/43/36.13/30.32/21.36
                                  // 1～100 美元：30/25.24/21.17/16.26/11.19
                                  // 高於 100 美元：17/14.28/11.38/8.3
```

- 製造商代碼 `REI` 走另一組較低的毛利（50/45/38/31.13/25.32/16.36、25/20.24/16.17/11.26/6.19、12/9.28/6.38/3.3）。
- 成本低於 1 美元時報價取 4 位小數，其餘取 2 位，與原頁一致。
- 已用原頁對同一支 API 的輸出逐列比對：`LM358` 82 列、16 欄完全一致；`AD584`（REI）、`AD2700SD`（>100 美元）的價格級距亦相同。

### 其他

- API 已回 `Access-Control-Allow-Origin: *`，靜態頁（含 `file://`）可直接抓；一次最多回約 20 個料號，沒有分頁，前綴查詢只顯示前 20 個。
- 沒有 API key、沒有後端；要換端點只改 `assets/js/rochester.js` 的 `API` 常數。
- `brands.html#rochester` 只保留查詢入口（GET 到 `rochester.html?q=`），查詢結果與報價只放在查詢頁，避免兩套邏輯。
- 需要連網；斷線或 API 掛掉時顯示重試、寄信與 rocelec.com 連結。

## 上線前需要確認／替換

1. **地址與電話**：目前用「台北市內湖區內湖路一段 250 號 11 樓 / +886 2 2627 5966」，請以公司登記與官網公告為準。
2. **業務信箱**：頁面用 `service@longtrump.com.tw` 佔位，請換成實際對外窗口。
3. **表單**：`contact.html` 是示範表單（前端提示，不送出）。上線要接 Formspree／自家 API，或改成 mailto。
4. **品牌 Logo**：目前只放品牌名稱文字。正式上線建議換成授權正確的原廠 logo（需確認各原廠 CI 使用規範）。
5. **隱私權政策／Cookie**：有表單、GA、`contact.html` 的 Google 地圖嵌入（會載入 Google cookie／紀錄），以及 `rochester.html` 的查詢（會把料號送到 AWS API Gateway）的話要補。
6. **數字**：11 個品牌、5 個據點、2002 首證皆取自 wiki；若要放營收、員工數、客戶滿意度，請先確認可公開。

## 本機預覽

直接雙擊 `index.html`。若要模擬手機，Chrome DevTools → Toggle device toolbar。

## 驗證

```powershell
node tools/audit.mjs     # 版面溢出、圖片、reveal、h1、字體（五頁 × 三寬度）
node tools/checks.mjs    # 文字對比、行動版選單開合
node tools/rl-check.mjs  # Rochester 查詢：16 欄、與原頁逐列比對、空結果、斷線、手機
```
（腳本用 `playwright-core` + 本機 Chrome，路徑已寫死在使用者的 j-jimeng-web 安裝位置。）
