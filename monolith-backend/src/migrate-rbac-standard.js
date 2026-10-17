import pool from './db.js';

export async function migrateRBAC() {
  console.log('====================================================');
  console.log(' Starting RBAC Standard Schema Migration for hrm_db');
  console.log('====================================================');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Create Roles Table
    console.log('1. Creating Roles table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Roles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role_code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create Permissions Table
    console.log('2. Creating Permissions table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Permissions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        permission_code VARCHAR(100) NOT NULL UNIQUE,
        module VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create Role_Permissions Junction Table
    console.log('3. Creating Role_Permissions junction table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Role_Permissions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role_id INT UNSIGNED NOT NULL,
        permission_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_role_permission (role_id, permission_id),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed Standard Hospital Roles
    console.log('4. Seeding Standard Hospital Roles...');
    const rolesData = [
      {
        role_code: 'SUPER_ADMIN',
        name: 'Ban Giám Đốc / Quản Trị Hệ Thống Tối Cao',
        description: 'Toàn quyền điều hành, phê duyệt, giám sát hệ thống và phân quyền IAM.'
      },
      {
        role_code: 'HR_MANAGER',
        name: 'Trưởng Phòng Tổ Chức Cán Bộ / HR Manager',
        description: 'Quản lý nhân sự, hợp đồng, định mức lương, phê duyệt nghỉ phép và chứng chỉ hành nghề.'
      },
      {
        role_code: 'DEPARTMENT_HEAD',
        name: 'Trưởng Khoa / Lãnh Đạo Đơn Vị Chuyên Môn',
        description: 'Chủ trì giao ban khoa, điều phối lịch trực khoa, giám sát bàn giao ca và duyệt phép nội bộ.'
      },
      {
        role_code: 'DOCTOR',
        name: 'Bác Sĩ Điều Trị Lâm Sàng',
        description: 'Thực hiện khám chữa bệnh, trực cấp cứu, ghi sổ bàn giao ca trực và tham gia giao ban viện.'
      },
      {
        role_code: 'NURSE',
        name: 'Điều Dưỡng Viên / Nữ Hộ Sinh',
        description: 'Chăm sóc người bệnh, trực buồng bệnh, đối chiếu sổ bàn giao trực khoa và chấm công.'
      },
      {
        role_code: 'TECHNICIAN',
        name: 'Kỹ Thuật Viên Cận Lâm Sàng & Dược',
        description: 'Thực hiện chẩn đoán hình ảnh, xét nghiệm huyết học/vi sinh, cấp phát thuốc và vật tư.'
      },
      {
        role_code: 'STAFF',
        name: 'Nhân Viên Hành Chính & Hỗ Trợ Viện',
        description: 'Nhân viên dịch vụ, lễ tân, bảo vệ, lái xe cấp cứu và hậu cần bệnh viện.'
      }
    ];

    for (const r of rolesData) {
      await conn.execute(`
        INSERT INTO Roles (role_code, name, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
      `, [r.role_code, r.name, r.description]);
    }

    // 5. Seed Functional Permissions
    console.log('5. Seeding Functional Permissions...');
    const permissionsData = [
      // IAM & System
      { code: 'iam:accounts:read', module: 'IAM', desc: 'Xem danh sách và trạng thái tài khoản người dùng' },
      { code: 'iam:accounts:manage', module: 'IAM', desc: 'Khóa / Mở khóa tài khoản và đặt lại mật khẩu' },
      { code: 'iam:roles:assign', module: 'IAM', desc: 'Phân quyền và thay đổi vai trò tài khoản' },

      // HR & Personnel
      { code: 'hr:employees:read', module: 'HR', desc: 'Tra cứu danh bạ và hồ sơ cán bộ nhân viên' },
      { code: 'hr:employees:manage', module: 'HR', desc: 'Tiếp nhận cán bộ mới và cập nhật hồ sơ chủ' },
      { code: 'hr:departments:manage', module: 'HR', desc: 'Quản lý cơ cấu tổ chức và khoa phòng bệnh viện' },
      { code: 'hr:licenses:manage', module: 'HR', desc: 'Giám sát và hậu kiểm chứng chỉ hành nghề y tế' },

      // Leaves
      { code: 'leaves:request:create', module: 'LEAVES', desc: 'Lập đơn xin nghỉ phép cá nhân' },
      { code: 'leaves:request:approve', module: 'LEAVES', desc: 'Phê duyệt hoặc từ chối đơn xin nghỉ phép' },

      // Payroll
      { code: 'payroll:rates:view', module: 'PAYROLL', desc: 'Xem bảng định mức lương và bậc thuế' },
      { code: 'payroll:rates:manage', module: 'PAYROLL', desc: 'Điều chỉnh định mức lương và phụ cấp trực' },
      { code: 'payroll:runs:execute', module: 'PAYROLL', desc: 'Tính toán và chốt kỳ chi trả lương bệnh viện' },

      // Shifts & Roster
      { code: 'shifts:roster:read', module: 'SHIFTS', desc: 'Xem lịch thường trực 4 cấp và kíp trực luân phiên' },
      { code: 'shifts:roster:schedule', module: 'SHIFTS', desc: 'Phân bổ và điều phối ca trực lâm sàng' },
      { code: 'attendance:clock:record', module: 'ATTENDANCE', desc: 'Chấm công vào/ra ca trực và điểm danh' },

      // Handovers & Briefings (Hospital Standards)
      { code: 'handovers:shift:read', module: 'HANDOVERS', desc: 'Xem sổ bàn giao ca trực lâm sàng' },
      { code: 'handovers:shift:create', module: 'HANDOVERS', desc: 'Ghi sổ bàn giao ca trực và tải ảnh biên bản' },
      { code: 'briefings:daily:read', module: 'BRIEFINGS', desc: 'Xem sổ giao ban toàn viện và giao ban khoa' },
      { code: 'briefings:daily:create', module: 'BRIEFINGS', desc: 'Lập biên bản sổ giao ban và ghi nhận chỉ đạo' },

      // Tasks & Notifications
      { code: 'tasks:manage', module: 'TASKS', desc: 'Giao việc và theo dõi tiến trình công việc' },
      { code: 'notifications:broadcast', module: 'NOTIFICATIONS', desc: 'Phát lệnh thông báo khẩn cấp toàn viện' }
    ];

    for (const p of permissionsData) {
      await conn.execute(`
        INSERT INTO Permissions (permission_code, module, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE module = VALUES(module), description = VALUES(description);
      `, [p.code, p.module, p.desc]);
    }

    // 6. Map Role Permissions
    console.log('6. Mapping Permissions to Roles...');
    const [allRoles] = await conn.execute('SELECT id, role_code FROM Roles');
    const [allPerms] = await conn.execute('SELECT id, permission_code FROM Permissions');

    const roleMap = new Map(allRoles.map(r => [r.role_code, r.id]));
    const permMap = new Map(allPerms.map(p => [p.permission_code, p.id]));

    const grant = async (roleCode, permCodes) => {
      const roleId = roleMap.get(roleCode);
      if (!roleId) return;
      for (const pCode of permCodes) {
        const permId = permMap.get(pCode);
        if (permId) {
          await conn.execute(`
            INSERT IGNORE INTO Role_Permissions (role_id, permission_id)
            VALUES (?, ?)
          `, [roleId, permId]);
        }
      }
    };

    // SUPER_ADMIN: All permissions
    await grant('SUPER_ADMIN', allPerms.map(p => p.permission_code));

    // HR_MANAGER
    await grant('HR_MANAGER', [
      'iam:accounts:read', 'iam:accounts:manage', 'iam:roles:assign',
      'hr:employees:read', 'hr:employees:manage', 'hr:departments:manage', 'hr:licenses:manage',
      'leaves:request:create', 'leaves:request:approve',
      'payroll:rates:view', 'payroll:rates:manage', 'payroll:runs:execute',
      'shifts:roster:read', 'attendance:clock:record',
      'handovers:shift:read', 'briefings:daily:read', 'briefings:daily:create',
      'tasks:manage', 'notifications:broadcast'
    ]);

    // DEPARTMENT_HEAD
    await grant('DEPARTMENT_HEAD', [
      'hr:employees:read',
      'leaves:request:create', 'leaves:request:approve',
      'shifts:roster:read', 'shifts:roster:schedule', 'attendance:clock:record',
      'handovers:shift:read', 'handovers:shift:create',
      'briefings:daily:read', 'briefings:daily:create',
      'tasks:manage', 'notifications:broadcast'
    ]);

    // DOCTOR
    await grant('DOCTOR', [
      'hr:employees:read',
      'leaves:request:create',
      'shifts:roster:read', 'attendance:clock:record',
      'handovers:shift:read', 'handovers:shift:create',
      'briefings:daily:read',
      'tasks:manage'
    ]);

    // NURSE
    await grant('NURSE', [
      'hr:employees:read',
      'leaves:request:create',
      'shifts:roster:read', 'attendance:clock:record',
      'handovers:shift:read', 'handovers:shift:create',
      'tasks:manage'
    ]);

    // TECHNICIAN
    await grant('TECHNICIAN', [
      'hr:employees:read',
      'leaves:request:create',
      'shifts:roster:read', 'attendance:clock:record',
      'tasks:manage'
    ]);

    // STAFF
    await grant('STAFF', [
      'hr:employees:read',
      'leaves:request:create',
      'shifts:roster:read', 'attendance:clock:record',
      'tasks:manage'
    ]);

    // 7. Add role_code column to Accounts table if not exists
    console.log('7. Altering Accounts table to add role_code column...');
    const [cols] = await conn.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'role_code';
    `);

    if (cols.length === 0) {
      await conn.execute(`
        ALTER TABLE Accounts
        ADD COLUMN role_code VARCHAR(50) NOT NULL DEFAULT 'STAFF' AFTER username,
        ADD KEY idx_accounts_role (role_code),
        ADD CONSTRAINT fk_accounts_role FOREIGN KEY (role_code) REFERENCES Roles(role_code) ON UPDATE CASCADE;
      `);
      console.log('Added role_code column and FK constraint to Accounts table.');
    }

    // 8. Data Migration: Copy role from Employees to Accounts
    console.log('8. Migrating roles from Employees to Accounts...');
    await conn.execute(`
      UPDATE Accounts a
      JOIN Employees e ON a.employee_id = e.id
      SET a.role_code = e.role
      WHERE a.role_code = 'STAFF' AND e.role IS NOT NULL;
    `);

    await conn.commit();
    console.log('====================================================');
    console.log(' RBAC Standard Schema Migration COMPLETED Successfully!');
    console.log('====================================================');
  } catch (error) {
    await conn.rollback();
    console.error('Migration failed:', error);
    throw error;
  } finally {
    conn.release();
  }
}

if (process.argv[1]?.endsWith('migrate-rbac-standard.js')) {
  migrateRBAC()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
