# Food Bazar Cafe — POS (Production)

Offline Point of Sale for **Food Bazar Cafe**  
**Dargai Phattak MKD** · Phone **0317-3451369** · Pakistan · Rs / PKR

## Start production

Double-click **`start-pos.bat`**

Or:

```powershell
cd "O:\Softwares Development\Food Bazar Cafe\POS"
npm.cmd run build
npm.cmd start
```

Open **http://127.0.0.1:3847**

Keep the black window open while the café is open. Close it to stop the POS.

## Login (change PINs after first day)

| User | PIN | Role |
|------|-----|------|
| admin | 1234 | Full access |
| manager | 2222 | Ops |
| cashier | 1111 | POS + orders |
| kitchen | 3333 | Kitchen |

## Daily use

1. Login → **POS** → add items → **Send to kitchen** or **Pay now**
2. **Kitchen** screen for unpaid / cooking tickets
3. **Orders** → collect payment → **Print** (FoodBazar Receipt printer)
4. Print tip: paper **58mm/80mm**, margins **None**, headers **off**

## Database

- File: `data\foodbazarcafe.db`
- Nightly auto-backup to GitHub after **11:00 PM** (Pakistan) when on Wi‑Fi  
  Repo: https://github.com/Zarar-Anwar/EssaKhan_database  
  Task: `FoodBazarCafe-DB-GitHub-Backup`  
  Logs: `data\backup-logs\backup.log`

### Fresh reset (wipe all orders)

```powershell
# Stop POS first, then:
Remove-Item "data\foodbazarcafe.db*" -Force
node server/init-db.js
npm.cmd run import-menu
```

## Re-import menu only

```powershell
npm.cmd run import-menu
```
