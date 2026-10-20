# Hướng Dẫn Cài Đặt, Khởi Chạy & Vận Hành Hệ Thống (User Guide)

Tài liệu này hướng dẫn các bước cài đặt môi trường, khởi tạo cơ sở dữ liệu MySQL, chạy máy chủ Backend (`backend`), chạy giao diện Frontend (`frontend`) và thực thi bộ kiểm thử tự động.

---

## 1. Yêu Cầu Môi Trường

Đảm bảo máy tính đã cài đặt:
1. **Node.js**: Phiên bản `18.0.0` trở lên (`node -v`).
2. **MySQL Server 8.0+**: Dịch vụ MySQL (`MySQL80`) trên máy hoặc qua Docker (`docker compose up -d`).

---

## 2. Cấu Hình Biến Môi Trường (`.env`)

Tệp cấu hình `backend/.env` (có thể sao chép từ `backend/.env.example`):

```env
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=admin
DB_NAME=hrm_db

JWT_SECRET=hospital_hrm_super_secret_jwt_key_2026
```

---

## 3. Các Bước Khởi Chạy Hệ Thống

### Bước 1: Cài đặt phụ thuộc
Từ thư mục gốc của dự án, chạy lệnh:
```bash
npm install
```

### Bước 2: Khởi tạo Cấu trúc Bảng & Nạp Dữ liệu Mẫu
```bash
# Tạo các bảng trong cơ sở dữ liệu từ backend/schema.sql
npm run db:migrate

# Nạp dữ liệu mẫu cho hệ thống
npm run db:seed
```
*(Nếu muốn làm mới toàn bộ cơ sở dữ liệu từ đầu, sử dụng lệnh `npm run db:wipe`)*.

### Bước 3: Khởi chạy Máy chủ Backend (Port 4000)
```bash
npm start
```
- **Máy chủ API**: `http://localhost:4000`
- **Tài liệu Swagger API**: `http://localhost:4000/api-docs`
- **Health Check**: `http://localhost:4000/api/health`

### Bước 4: Khởi chạy Ứng dụng Frontend (Port 5173)

Mở một cửa sổ terminal mới:
```bash
# Chế độ phát triển (Development)
cd frontend
npm run dev
```

Hoặc đóng gói và chạy bản **Production**:
```bash
cd frontend
npm run build
npm run preview
```
- **Truy cập ứng dụng tại**: `http://localhost:5173`

---

## 4. Danh Sách Tài Khoản Mẫu

Trên màn hình Đăng nhập (`/login`), có thể sử dụng các tài khoản mẫu sau:

| Vai Trò | Tên Đăng Nhập | Mật Khẩu | Phân Hệ Tiêu Biểu |
| :--- | :---: | :---: | :--- |
| **Quản Trị Hệ Thống (`SUPER_ADMIN`)** | `admin` | `admin123` | `/admin`, `/hr`, toàn bộ các trang |
| **Quản Lý Nhân Sự (`HR_MANAGER`)** | `hr.k` | `password123` | `/hr`, `/employees`, `/licenses`, `/payroll`, `/leave` |
| **Trưởng Khoa (`DEPARTMENT_HEAD`)** | `dr.b` | `password123` | `/shifts`, `/briefings`, `/handovers`, `/tasks`, `/leave` |
| **Bác Sĩ (`DOCTOR`)** | `dr.c` | `password123` | `/shifts`, `/attendance`, `/handovers`, `/briefings`, `/tasks` |
| **Điều Dưỡng (`NURSE`)** | `rn.f` | `password123` | `/shifts`, `/attendance`, `/handovers`, `/tasks`, `/leave` |
| **Kỹ Thuật Viên (`TECHNICIAN`)** | `tech.h` | `password123` | `/shifts`, `/attendance`, `/handovers`, `/tasks` |
| **Dược Sĩ / Nhân Viên (`STAFF`)** | `phar.i` | `password123` | `/tasks`, `/employees`, `/payroll`, `/profile` |

---

## 5. Kiểm Thử Hệ Thống

```bash
# Chạy bộ kiểm thử tự động Jest & Supertest cho Backend
npm test
```
