# Tanaka · 維修管理

通用機構／校園維修工具。一般 Google 帳戶可回報及查看全部新維修紀錄；管理員負責進度、地點設施、維修分類、CSV 匯出及授權。

[開啟工具](https://wcy.hk/Tanaka/)

## 地點與故障配對

先選地點，再選符合該地點設施的問題。禮堂沒有廁所時，不會出現廁所漏水選項。提交時在 Firestore transaction 重新讀取最新設定，Security Rules 再驗證設施配搭，不能只靠修改前端繞過。

管理員可新增、編輯及停用地點與分類。停用保留歷史紀錄。進度分為待處理、處理中、等待跟進、已完成、已取消。一般用戶不能修改處理進度或管理設定。

## 權限與資料

正式服務使用 Firebase Google Authentication 及 Cloud Firestore。讀取需要已驗證的 Google 身分。管理員儲存於受規則保護的 admins 集合，以已驗證電郵匹配；只有管理員可以變更授權，且不能停用自己。首次管理員由 Firebase 專案擁有者在控制台建立。

新版集合為 locations、issueTypes、tickets、admins。舊 Case、Store、Setting 不會被新版讀取，規則預設拒絕舊集合存取；舊資料清理需要先備份及確認。Firebase client config 是公開應用設定，不是管理密鑰；真正權限由已部署的 firestore.rules 控制。不要把服務帳戶金鑰、密碼、舊資料備份或環境檔提交到 Git。

## 測試及本機示範

靜態網站不需建置，直接由 GitHub Pages 託管。Firebase Web SDK 13.2.0 的三個 compat bundle 及授權檔隨網站提供。

開發測試需要 Node.js 24.12+、Java 21+：

```sh
npm install
npm test
npm run test:rules
```

權限測試只使用 demo-tanaka 模擬專案及虛構資料。測試覆蓋匿名存取、任意 Google 電郵、非 Google／未驗證身分、設施配搭、冒認回報者、管理員設定及舊集合隔離。

示範可在本機啟動 Auth 9099／Firestore 8080 模擬器，以虛構示範地點及管理員測試，並在 localhost 或 127.0.0.1 加上 ?demo=1。示範模式顯示醒目標籤，只連接 demo-tanaka；正式域名不能開啟此模式，測試憑證不被正式 Firebase 接受。

舊 home.html、home_admin.html、case.html、setting.html、authority.html、store.html 保留為新版入口，舊連結仍能進入工具。
