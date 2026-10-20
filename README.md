# Hospital Human Resources Management System (HRMS) with Work Process Tracking

Hệ thống quản lý nhân sự và theo dõi quy trình làm việc tại bệnh viện: quản lý hồ sơ nhân viên, chứng chỉ hành nghề, phân ca trực 24/7, chấm công, bàn giao ca trực, công việc hàng ngày, nghỉ phép và tính lương.

---

## Tài Liệu Hướng Dẫn

- **[Hướng Dẫn Khởi Chạy & Vận Hành (`docs/USER_GUIDE.md`)](./docs/USER_GUIDE.md)** — Hướng dẫn cài đặt môi trường, khởi tạo cơ sở dữ liệu và chạy hệ thống.

---

## Cấu Trúc Dự Án

| Phân hệ | Thư mục | Cổng | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| **Backend** | [`backend/`](./backend/) | `4000` | Cung cấp REST API, xác thực người dùng, phân quyền, kết nối MySQL và tài liệu Swagger (`/api-docs`). |
| **Frontend** | [`frontend/`](./frontend/) | `5173` | Giao diện web quản lý nhân sự và quy trình công việc, hỗ trợ song ngữ Việt – Anh. |
| **Scripts** | [`scripts/`](./scripts/) | — | Các script tạo dữ liệu mẫu và kiểm tra hệ thống. |

---

## Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### 1. Cài đặt phụ thuộc
```bash
npm install
```

### 2. Khởi tạo Cơ sở dữ liệu & Nạp dữ liệu mẫu
Đảm bảo MySQL 8.0 đang chạy, sau đó thực thi:
```bash
npm run db:migrate
npm run db:seed
```

### 3. Khởi chạy Backend (Port 4000)
```bash
npm start
```
- **Swagger API UI**: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
- **Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 4. Khởi chạy Frontend (Port 5173)
```bash
# Chế độ phát triển (Development)
cd frontend && npm run dev

# Hoặc đóng gói & chạy bản Production
cd frontend && npm run build && npm run preview
```
- **Giao diện ứng dụng**: [http://localhost:5173](http://localhost:5173)

### 5. Chạy Kiểm thử Tự động
```bash
npm test
```
