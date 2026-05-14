# Employee Benefits API

Payroll, benefit enrollments, retirement contributions, time-off, and document management.

## Run

```sh
npm install
npm start
```

Server listens on `http://localhost:3002`.

## Authentication

Use a long-lived API token:

```sh
curl -H "Authorization: Token demo_walter" http://localhost:3002/v1/employees
```

`Bearer` is also accepted for compatibility.

Sample tokens (from [`../users.json`](../users.json)). Only keys with a `companyId` see meaningful data; the others authenticate but every employee/payroll list comes back empty:

| Token          | Pretending to be    | Company              |
|----------------|---------------------|----------------------|
| `demo_walter`  | Walter Sobchak      | Sobchak Security     |
| `demo_maude`   | Maude Lebowski      | Hollywood Star Lanes |
| `demo_dude`    | Jeffrey Lebowski    | (none)               |
| `demo_daria`   | Daria Steen         | (none)               |

## Endpoints

### Health
- `GET /v1/health`

### Account & Company
- `GET /v1/account`
- `GET /v1/company`
- `PUT /v1/company`

### Employees
- `GET /v1/employees` (filterable by `status`, `department`, `employmentType`)
- `GET /v1/employees/:id`
- `POST /v1/employees`
- `PUT /v1/employees/:id`
- `POST /v1/employees/:id/terminate`
- `POST /v1/employees/:id/rehire`

### Payroll
- `GET /v1/payrolls`
- `GET /v1/payrolls/:id`
- `POST /v1/payrolls`
- `POST /v1/payrolls/:id/submit`
- `POST /v1/payrolls/:id/cancel`

### Benefits & Enrollments
- `GET /v1/benefits`
- `GET /v1/benefits/:id`
- `GET /v1/enrollments`
- `POST /v1/enrollments`
- `DELETE /v1/enrollments/:id`

### Contributions
- `GET /v1/contributions`
- `POST /v1/contributions`

### Time off
- `GET /v1/time-off/policies`
- `GET /v1/time-off/balances/:employeeId`
- `GET /v1/time-off/requests` (filterable by `status`)
- `POST /v1/time-off/requests`
- `POST /v1/time-off/requests/:id/approve`
- `POST /v1/time-off/requests/:id/deny`

### Documents
- `GET /v1/documents`
- `GET /v1/documents/:id`
- `POST /v1/documents/:id/sign-url`
