# ⏰ Work Time Tracker | ระบบบันทึกเวลาเข้า-ออกงาน

เว็บแอปพลิเคชันสำหรับ **จดบันทึกเวลาเข้า/ออกงาน** เพื่อคำนวณ **ค่าล่วงเวลา (OT)** และ **ค่ากะ (Shift)** ที่จะได้รับในแต่ละเดือน ช่วยให้สรุปรายรับของตนเองได้อย่างสะดวกและแม่นยำ

🔗 **ลองใช้งานได้ที่:** https://calendar-worker.vercel.app/

---

## 📌 เกี่ยวกับโปรเจกต์

เว็บนี้ถูกพัฒนาขึ้นเพื่อแก้ปัญหาการคำนวณเงินเดือนด้วยตนเอง โดยเฉพาะสำหรับผู้ที่มีการทำงานเป็นกะและมีชั่วโมง OT ที่ไม่แน่นอน ผู้ใช้สามารถ:

- 🕐 **บันทึกเวลาเข้า-ออกงาน** ในแต่ละวัน
- 💰 **คำนวณค่า OT** จากชั่วโมงทำงานล่วงเวลาโดยอัตโนมัติ
- 🌙 **คำนวณค่ากะ (Shift)** ตามรอบการทำงาน
- 📊 **สรุปรายรับรายเดือน** เพื่อวางแผนการเงินส่วนตัว

---

## 🛠️ เทคโนโลยีที่ใช้

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=anthropic&logoColor=white" />
</p>

| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | React + Vite |
| **Styling** | Tailwind CSS |
| **Database / Backend** | Supabase (PostgreSQL) |
| **AI Assistant** | Claude Code (ช่วยในการพัฒนา) |

---

## ✨ ฟีเจอร์หลัก

- ✅ บันทึกเวลาเข้า-ออกงานได้ง่าย
- ✅ คำนวณ OT และค่ากะอัตโนมัติ
- ✅ สรุปรายรับรายเดือนแบบเรียลไทม์
- ✅ ข้อมูลถูกจัดเก็บอย่างปลอดภัยบน Supabase

---

## 🚀 การติดตั้ง (Development)

```bash
# clone โปรเจกต์
git clone <repository-url>

# เข้าไปในโฟลเดอร์
cd work-time-tracker

# ติดตั้ง dependencies
npm install

# รันเซิร์ฟเวอร์สำหรับพัฒนา
npm run dev
```

---

## 🔧 การตั้งค่า Environment Variables

สร้างไฟล์ `.env` และเพิ่มค่าต่อไปนี้:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

<div align="center">

💖 พัฒนาด้วยความตั้งใจโดย **Ruthaichanok Kasun**

🌸 *"Code with passion, learn with curiosity, and create with love."* 🌸

</div>
