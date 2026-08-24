# 狼人殺無主持人發牌網站

無主持人的狼人殺線上發牌與流程控制網站。詳細規格見 [DEVELOPMENT_SPEC.md](./DEVELOPMENT_SPEC.md)。

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
- ✅ Phase 7：後端遊戲引擎（狀態機、狼人/預言家/女巫、投票、勝負判定）
- ✅ Phase 8：遊戲頁整合（可完整跑完一局）
- ⏳ Phase 9：開發測試工具（尚未開始）
- ⏳ Phase 10：打磨、錯誤處理與部署準備（尚未開始）

## 已知簡化與待補項目

- `NIGHT_START`／`DAY_ANNOUNCEMENT`／`DAY_EXILE_RESULT` 之間的短暫轉場延遲（1.2～3 秒）目前不會因玩家斷線而暫停；只有 `DAY_DISCUSSION` 倒數與所有需要玩家操作才能推進的階段會確實暫停。
- 尚未提供開發用多視角測試頁（`DevMultiViewPage`）。
- 尚未加入完整的前端錯誤提示、loading/disabled 細節打磨。
- `apps/server` 的 `build` script 目前只做 typecheck，尚未提供正式部署用的編譯產物。
