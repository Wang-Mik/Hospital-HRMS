import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Hospital HRMS Backend API',
    version: '1.0.0',
    description: 'REST API for Hospital Human Resources Management System (HRMS) with Work Process Tracking.',
    contact: {
      name: 'Hospital HRMS Engineering Team',
      email: 'engineering@hospital-hrm.org'
    }
  },
  servers: [
    {
      url: process.env.SERVER_URL || 'http://localhost:4000',
      description: 'Backend Service (Port 4000)'
    }
  ],
  components: {
    schemas: {
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          employee_code: { type: 'string', example: 'EMP-DOC-001' },
          first_name: { type: 'string', example: 'Alexander' },
          last_name: { type: 'string', example: 'Wright' },
          email: { type: 'string', example: 'dr.wright@hospital.org' },
          phone: { type: 'string', example: '+1-555-0192' },
          department_id: { type: 'integer', example: 1 },
          role: { type: 'string', example: 'DEPARTMENT_HEAD' },
          specialty: { type: 'string', example: 'Emergency Medicine' },
          status: { type: 'string', example: 'ACTIVE' }
        }
      },
      Shift: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          department_id: { type: 'integer', example: 1 },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
          shift_type: { type: 'string', example: 'MORNING' },
          status: { type: 'string', example: 'SCHEDULED' }
        }
      },
      AttendanceRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          shift_id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          clock_in_time: { type: 'string', format: 'date-time' },
          clock_out_time: { type: 'string', format: 'date-time' },
          attendance_status: { type: 'string', example: 'PRESENT' },
          overtime_minutes: { type: 'integer', example: 0 }
        }
      },
      LeaveRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          leave_type: { type: 'string', example: 'ANNUAL' },
          status: { type: 'string', example: 'PENDING' }
        }
      },
      LeaveBalance: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          accrual_year: { type: 'integer', example: 2026 },
          leave_type: { type: 'string', example: 'ANNUAL' },
          total_days: { type: 'integer', example: 25 },
          used_days: { type: 'integer', example: 5 },
          remaining_days: { type: 'integer', example: 20 }
        }
      },
      PaySlip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          run_id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          base_pay: { type: 'number', example: 7600.00 },
          night_differential: { type: 'number', example: 450.00 },
          overtime_pay: { type: 'number', example: 712.50 },
          net_pay: { type: 'number', example: 6850.00 },
          status: { type: 'string', example: 'CALCULATED' }
        }
      },
      PaymentElection: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', example: 'EMP-DOC-001' },
          bank_name: { type: 'string', example: 'JPMorgan Chase Bank' },
          account_number: { type: 'string', example: '1234567890' },
          routing_number: { type: 'string', example: '021000021' },
          is_primary: { type: 'boolean', example: true }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          target_staff_id: { type: 'string', example: 'EMP-DOC-001' },
          title: { type: 'string', example: 'Emergency Shift Cover Request' },
          message: { type: 'string', example: 'Cover shift requested' },
          type: { type: 'string', example: 'ALERT' },
          is_read: { type: 'boolean', example: false }
        }
      },
      DailyTask: {
        type: 'object',
        required: ['id', 'title', 'assigned_to', 'status'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique task UUID primary key'
          },
          title: {
            type: 'string',
            description: 'Task title',
            example: 'Morning ICU Ventilator Checks'
          },
          description: {
            type: 'string',
            nullable: true,
            description: 'Clinical or operational instructions',
            example: 'Perform morning calibration across all 12 beds in ICU.'
          },
          assigned_to: {
            type: 'string',
            description: 'Physical FK -> Employees.employee_code of assigned staff member',
            example: 'EMP-DOC-002'
          },
          assigned_by: {
            type: 'string',
            nullable: true,
            description: 'Physical FK -> Employees.employee_code of assigner/supervisor',
            example: 'EMP-DOC-001'
          },
          shift_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Physical FK -> Shifts.id of associated shift',
            example: '11111111-1111-4111-8111-111111111111'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            default: 'PENDING',
            description: 'Current execution status of daily task',
            example: 'PENDING'
          },
          due_date: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Target completion datetime',
            example: '2026-08-20 10:00:00'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      ShiftHandover: {
        type: 'object',
        required: ['id', 'outgoing_shift_id', 'status', 'logged_by'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique shift handover UUID primary key'
          },
          outgoing_shift_id: {
            type: 'string',
            format: 'uuid',
            description: 'Physical FK -> Shifts.id of outgoing shift handing over ward care',
            example: '11111111-1111-4111-8111-111111111111'
          },
          incoming_shift_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Physical FK -> Shifts.id of incoming shift taking over care',
            example: '22222222-2222-4222-8222-222222222222'
          },
          critical_notes: {
            type: 'string',
            nullable: true,
            description: 'Triage updates, critical lab alerts, pending patient transfers',
            example: 'Transferred 4 ICU admissions. Patient in Bed 4 scheduled for abdominal CT at 16:00.'
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'PENDING_SIGNATURE', 'COMPLETED'],
            default: 'DRAFT',
            description: 'Handover report status lifecycle',
            example: 'DRAFT'
          },
          logged_by: {
            type: 'string',
            description: 'Physical FK -> Employees.employee_code of outgoing clinician logging handover',
            example: 'EMP-DOC-001'
          },
          acknowledged_by: {
            type: 'string',
            nullable: true,
            description: 'Physical FK -> Employees.employee_code of incoming clinician signing handover',
            example: 'EMP-NUR-001'
          },
          checklists: {
            type: 'array',
            description: 'Itemized clinical safety verification checklist items',
            items: {
              $ref: '#/components/schemas/HandoverChecklist'
            }
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      HandoverChecklist: {
        type: 'object',
        required: ['id', 'handover_id', 'item_description', 'is_verified'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique checklist item UUID primary key'
          },
          handover_id: {
            type: 'string',
            format: 'uuid',
            description: 'Physical FK -> Shift_Handovers.id parent shift handover record',
            example: '11111111-hand-4111-8111-111111111111'
          },
          item_description: {
            type: 'string',
            description: 'Safety item / protocol verification description',
            example: 'Controlled substances & narcotics count verified against safe log'
          },
          is_verified: {
            type: 'boolean',
            default: false,
            description: 'Item verification check status flag',
            example: true
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Account: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            description: 'Unique account UUID primary key'
          },
          employee_id: {
            type: 'integer',
            example: 1,
            description: 'Physical FK -> Employees.id'
          },
          username: {
            type: 'string',
            example: 'dr.wright',
            description: 'Unique login handle'
          },
          is_locked: {
            type: 'boolean',
            example: false,
            description: 'Account lock status'
          },
          last_login: {
            type: 'string',
            format: 'date-time',
            nullable: true
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new employee authentication account',
        tags: ['Authentication & Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employee_id', 'username', 'password'],
                properties: {
                  employee_id: { type: 'integer', example: 1 },
                  username: { type: 'string', example: 'dr.wright' },
                  password: { type: 'string', format: 'password', example: 'SecurePass2026!' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Account registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Account registered successfully' },
                    data: { $ref: '#/components/schemas/Account' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing mandatory fields or invalid foreign key' },
          409: { description: 'Username already exists' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate employee credentials and issue JWT token',
        tags: ['Authentication & Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'dr.wright' },
                  password: { type: 'string', format: 'password', example: 'SecurePass2026!' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful, returns JWT bearer token and user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        account: { $ref: '#/components/schemas/Account' },
                        employee: { $ref: '#/components/schemas/Employee' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing username or password' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account is locked' }
        }
      }
    }
  }
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './backend/src/routes/*.js',
    './backend/src/routes/**/*.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Hospital HRMS Backend API Docs'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export default setupSwagger;
