# 狼人殺無主持人發牌網站

無主持人的狼人殺線上發牌與流程控制網站。詳細規格見 [DEVELOPMENT_SPEC.md](./DEVELOPMENT_SPEC.md)。

固定核心角色為狼人、預言家、女巫，房主可依人數再加選獵人、守衛、騎士，其餘補平民。遊戲內含語音敘事、音樂與音效系統，並支援死亡玩家以旁觀者身分繼續觀看（可選擇是否揭露身分）。

## 專案結構

Monorepo（npm workspaces）：

- `apps/web`：React + TypeScript + Vite 前端
- `apps/server`：Node.js + TypeScript + Express + Socket.IO 後端
- `packages/shared`：前後端共用的型別、常數與事件定義

## 開發環境需求

- Node.js 20+
- npm 10+

## 安裝

```bash
npm install
```

## 開發

```bash
npm run dev          # 同時啟動前端與後端
npm run dev:web      # 只啟動前端（http://localhost:5173）
npm run dev:server   # 只啟動後端（http://localhost:3000）
```

後端環境變數（可放在 `apps/server/.env`，參考 `apps/server/.env.example`）：

- `PORT`（預設 3000）
- `CLIENT_ORIGIN`（預設 `http://localhost:5173`，用於 CORS 白名單）

前端環境變數（可放在 `apps/web/.env`，參考 `apps/web/.env.example`）：

- `VITE_SERVER_URL`（預設 `http://localhost:3000`）

## 部署

`master` 每次 push 會透過 GitHub Actions（見 [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)）自動跑 `typecheck` 與 `test`，通過後建置前端並部署到 GitHub Pages。後端則依 [`render.yaml`](./render.yaml) 部署到 Render，需在該服務設定 `CLIENT_ORIGIN` 環境變數為前端網域。

## 開發測試工具

`npm run dev:web` 啟動後，開發環境下可以開 http://localhost:5173/dev 使用內建的多玩家測試頁：一鍵建立測試房、一鍵補滿假玩家，並可在同一頁的分頁列切換不同玩家視角（每個模擬玩家都是獨立的 Socket.IO 連線，用真正的畫面元件渲染，不是另外做的簡化版）。不需要再手動開多個無痕視窗測試——而且無痕視窗本來就會共用 localStorage，同一瀏覽器開多個無痕視窗實際上會被當成同一個玩家。

這個頁面只存在於開發模式：路由是用 `import.meta.env.DEV` 在 build 階段擋掉再搭配動態 import，`npm run build` 產出的正式版完全不含這個頁面的程式碼（已用 `grep` 驗證過 dist 內容）。

## 檢查與測試

```bash
npm run typecheck    # 檢查所有 TypeScript
npm run test         # 執行後端測試
npm run build        # 建置前端（後端目前以 tsx 直接執行，見下方說明）
```

## 執行方式說明

第一版後端不做獨立編譯輸出，`dev` 與 `start` 都透過 [`tsx`](https://github.com/privatenumber/tsx) 直接執行 TypeScript 原始碼（`apps/server` 的 `build` script 目前等同 `typecheck`）。`packages/shared` 同樣以原始碼形式被前後端直接引用，不需要額外編譯步驟。正式部署時如需獨立編譯產物，可再補上打包設定。

## 目前完成進度

依 `DEVELOPMENT_SPEC.md` 第 25 節的 Phase 順序：

- ✅ Phase 1：專案骨架與開發環境
- ✅ Phase 2：共用型別與規則常數
- ✅ Phase 3：後端房間與玩家管理（含 reconnect token、踢人、房主轉移、閒置清除）
- ✅ Phase 4：Socket.IO 狀態同步基礎
- ✅ Phase 5：前端基本流程（首頁、等待房、加入）
- ✅ Phase 6：選牌與角色揭示
- ✅ Phase 7：後端遊戲引擎（狀態機、狼人/預言家/女巫/獵人/守衛/騎士、投票、勝負判定）
- ✅ Phase 8：遊戲頁整合（可完整跑完一局）
- ✅ Phase 9：開發測試工具（`DevMultiViewPage`，見上方「開發測試工具」）
- 🔄 Phase 10：打磨、錯誤處理與部署準備（進行中——CI/CD 部署已上線，見上方「部署」；多數頁面已補上錯誤提示與 loading/disabled 狀態，手機版細節與邊界情況仍持續調整）

## 已知簡化與待補項目

- `NIGHT_START`／`DAY_ANNOUNCEMENT`／`DAY_EXILE_RESULT` 之間的短暫轉場延遲（1.2～3 秒）目前不會因玩家斷線而暫停；只有 `DAY_DISCUSSION` 倒數與所有需要玩家操作才能推進的階段會確實暫停。
- 前端錯誤提示與手機版細節仍持續打磨中，尚未覆蓋所有邊界情況。
- `apps/server` 的 `build` script 目前只做 typecheck，尚未提供正式部署用的編譯產物（Render 上直接以 `tsx` 執行原始碼）。
