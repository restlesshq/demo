const express = require("express");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  companies,
  employees,
  payrolls,
  benefits,
  enrollments,
  contributions,
  timeOffPolicies,
  timeOffBalances,
  timeOffRequests,
  documents,
} = require("./data");

const users = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "users.json"), "utf8"));
const usersByApiKey = new Map(users.map((u) => [u.apiKey, u]));

const app = express();
app.use(express.json());

// ── Error helper ─────────────────────────────────────
class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const sendErr = (res, err) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
};

// ── Auth ─────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === "/v1/health") return next();

  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Token ") ? auth.slice(6)
    : auth.startsWith("Bearer ") ? auth.slice(7)
    : auth;
  const user = token && usersByApiKey.get(token);
  if (!user) {
    return sendErr(res, new ApiError(
      "auth_required",
      "Missing or invalid API token. Pass `Authorization: Token <token>`.",
      401,
    ));
  }
  req.account = user;
  next();
});

// ── Helpers ──────────────────────────────────────────
const newId = (prefix) => `${prefix}_${crypto.randomBytes(4).toString("hex")}`;

const requireFields = (body, fields) => {
  for (const f of fields) {
    if (body == null || body[f] == null || body[f] === "") {
      throw new ApiError("invalid_request", `Missing required field: ${f}`, 422);
    }
  }
};

const wrap = (handler) => (req, res) => {
  Promise.resolve()
    .then(() => handler(req, res))
    .catch((err) => sendErr(res, err));
};

const scoped = (req, list, idField = "companyId") =>
  list.filter((row) => row[idField] === req.account.companyId);

const findCompany = (req) => companies.find((c) => c.id === req.account.companyId);

// ── Health ───────────────────────────────────────────
app.get("/v1/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), version: "2.1.0" });
});

// ── Account / Company ────────────────────────────────
app.get("/v1/account", wrap((req, res) => {
  res.json({
    accountId: req.account.id,
    name: req.account.name,
    company: findCompany(req),
  });
}));

app.get("/v1/company", wrap((req, res) => {
  const c = findCompany(req);
  if (!c) throw new ApiError("company_not_found", "No company on file.", 404);
  res.json(c);
}));

app.put("/v1/company", wrap((req, res) => {
  const c = findCompany(req);
  if (!c) throw new ApiError("company_not_found", "No company on file.", 404);
  Object.assign(c, req.body);
  res.json(c);
}));

// ── Employees ────────────────────────────────────────
app.get("/v1/employees", wrap((req, res) => {
  const { status, department, employmentType } = req.query;
  let list = scoped(req, employees);
  if (status) list = list.filter((e) => e.status === status);
  if (department) list = list.filter((e) => e.department === department);
  if (employmentType) list = list.filter((e) => e.employmentType === employmentType);
  res.json({ data: list, count: list.length });
}));

app.get("/v1/employees/:id", wrap((req, res) => {
  const emp = employees.find((e) => e.id === req.params.id && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.params.id}`, 404);
  res.json(emp);
}));

app.post("/v1/employees", wrap((req, res) => {
  requireFields(req.body, ["firstName", "lastName", "email", "startDate", "employmentType"]);
  if (req.body.employmentType === "salary" && req.body.annualSalaryCents == null) {
    throw new ApiError("invalid_request", "annualSalaryCents required for salaried employees.", 422);
  }
  if (req.body.employmentType === "hourly" && req.body.hourlyRateCents == null) {
    throw new ApiError("invalid_request", "hourlyRateCents required for hourly employees.", 422);
  }
  const emp = {
    id: newId("emp"),
    companyId: req.account.companyId,
    status: "active",
    ...req.body,
  };
  employees.push(emp);
  res.status(201).json(emp);
}));

app.put("/v1/employees/:id", wrap((req, res) => {
  const emp = employees.find((e) => e.id === req.params.id && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.params.id}`, 404);
  Object.assign(emp, req.body);
  res.json(emp);
}));

app.post("/v1/employees/:id/terminate", wrap((req, res) => {
  const emp = employees.find((e) => e.id === req.params.id && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.params.id}`, 404);
  if (emp.status === "terminated") {
    throw new ApiError("already_terminated", "Employee is already terminated.", 409);
  }
  emp.status = "terminated";
  emp.terminationDate = req.body?.terminationDate ?? new Date().toISOString().slice(0, 10);
  emp.terminationReason = req.body?.reason ?? "voluntary";
  res.json(emp);
}));

app.post("/v1/employees/:id/rehire", wrap((req, res) => {
  const emp = employees.find((e) => e.id === req.params.id && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.params.id}`, 404);
  emp.status = "active";
  delete emp.terminationDate;
  delete emp.terminationReason;
  res.json(emp);
}));

// ── Payroll ──────────────────────────────────────────
app.get("/v1/payrolls", wrap((req, res) => {
  const list = scoped(req, payrolls);
  res.json({ data: list, count: list.length });
}));

app.get("/v1/payrolls/:id", wrap((req, res) => {
  const p = payrolls.find((x) => x.id === req.params.id && x.companyId === req.account.companyId);
  if (!p) throw new ApiError("payroll_not_found", `No payroll with id ${req.params.id}`, 404);
  res.json(p);
}));

app.post("/v1/payrolls", wrap((req, res) => {
  requireFields(req.body, ["periodStart", "periodEnd", "payDate"]);
  const p = {
    id: newId("pay"),
    companyId: req.account.companyId,
    status: "draft",
    employees: scoped(req, employees).filter((e) => e.status === "active").map((e) => e.id),
    grossCents: 0,
    netCents: 0,
    taxesCents: 0,
    deductionsCents: 0,
    ...req.body,
  };
  payrolls.push(p);
  res.status(201).json(p);
}));

app.post("/v1/payrolls/:id/submit", wrap((req, res) => {
  const p = payrolls.find((x) => x.id === req.params.id && x.companyId === req.account.companyId);
  if (!p) throw new ApiError("payroll_not_found", `No payroll with id ${req.params.id}`, 404);
  if (p.status === "paid") throw new ApiError("payroll_already_paid", "Payroll has already been paid.", 409);
  p.status = "processing";
  res.json(p);
}));

app.post("/v1/payrolls/:id/cancel", wrap((req, res) => {
  const p = payrolls.find((x) => x.id === req.params.id && x.companyId === req.account.companyId);
  if (!p) throw new ApiError("payroll_not_found", `No payroll with id ${req.params.id}`, 404);
  if (p.status === "paid") throw new ApiError("payroll_already_paid", "Cannot cancel a paid payroll.", 409);
  p.status = "cancelled";
  res.json(p);
}));

// ── Benefits ─────────────────────────────────────────
app.get("/v1/benefits", wrap((req, res) => {
  res.json({ data: benefits });
}));

app.get("/v1/benefits/:id", wrap((req, res) => {
  const b = benefits.find((x) => x.id === req.params.id);
  if (!b) throw new ApiError("benefit_not_found", `No benefit with id ${req.params.id}`, 404);
  res.json(b);
}));

app.get("/v1/enrollments", wrap((req, res) => {
  const empIds = new Set(scoped(req, employees).map((e) => e.id));
  const list = enrollments.filter((e) => empIds.has(e.employeeId));
  res.json({ data: list });
}));

app.post("/v1/enrollments", wrap((req, res) => {
  requireFields(req.body, ["employeeId", "benefitId", "effectiveDate"]);
  const emp = employees.find((e) => e.id === req.body.employeeId && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.body.employeeId}`, 422);
  if (!benefits.find((b) => b.id === req.body.benefitId)) {
    throw new ApiError("benefit_not_found", `No benefit with id ${req.body.benefitId}`, 422);
  }
  const enr = {
    id: newId("enr"),
    status: "pending",
    dependents: [],
    employeeContributionCents: 0,
    employerContributionCents: 0,
    ...req.body,
  };
  enrollments.push(enr);
  res.status(201).json(enr);
}));

app.delete("/v1/enrollments/:id", wrap((req, res) => {
  const idx = enrollments.findIndex((e) => e.id === req.params.id);
  if (idx === -1) throw new ApiError("enrollment_not_found", `No enrollment with id ${req.params.id}`, 404);
  enrollments[idx].status = "terminated";
  res.json(enrollments[idx]);
}));

// ── Contributions ────────────────────────────────────
app.get("/v1/contributions", wrap((req, res) => {
  const empIds = new Set(scoped(req, employees).map((e) => e.id));
  const list = contributions.filter((c) => empIds.has(c.employeeId));
  res.json({ data: list });
}));

app.post("/v1/contributions", wrap((req, res) => {
  requireFields(req.body, ["employeeId", "type", "percent"]);
  const c = { id: newId("ct"), employerMatchPercent: 0, ...req.body };
  contributions.push(c);
  res.status(201).json(c);
}));

// ── Time off ─────────────────────────────────────────
app.get("/v1/time-off/policies", wrap((req, res) => {
  res.json({ data: timeOffPolicies });
}));

app.get("/v1/time-off/balances/:employeeId", wrap((req, res) => {
  const emp = employees.find((e) => e.id === req.params.employeeId && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.params.employeeId}`, 404);
  const list = timeOffBalances.filter((b) => b.employeeId === req.params.employeeId);
  res.json({ employeeId: emp.id, balances: list });
}));

app.get("/v1/time-off/requests", wrap((req, res) => {
  const empIds = new Set(scoped(req, employees).map((e) => e.id));
  const list = timeOffRequests.filter((r) => empIds.has(r.employeeId));
  if (req.query.status) {
    res.json({ data: list.filter((r) => r.status === req.query.status) });
    return;
  }
  res.json({ data: list });
}));

app.post("/v1/time-off/requests", wrap((req, res) => {
  requireFields(req.body, ["employeeId", "policyId", "startDate", "endDate", "hours"]);
  const emp = employees.find((e) => e.id === req.body.employeeId && e.companyId === req.account.companyId);
  if (!emp) throw new ApiError("employee_not_found", `No employee with id ${req.body.employeeId}`, 422);
  const r = { id: newId("tor"), status: "pending", ...req.body };
  timeOffRequests.push(r);
  res.status(201).json(r);
}));

app.post("/v1/time-off/requests/:id/approve", wrap((req, res) => {
  const r = timeOffRequests.find((x) => x.id === req.params.id);
  if (!r) throw new ApiError("request_not_found", `No request with id ${req.params.id}`, 404);
  if (r.status !== "pending") {
    throw new ApiError("request_not_pending", `Request is ${r.status} and cannot be approved.`, 409);
  }
  r.status = "approved";
  r.approvedAt = new Date().toISOString();
  res.json(r);
}));

app.post("/v1/time-off/requests/:id/deny", wrap((req, res) => {
  const r = timeOffRequests.find((x) => x.id === req.params.id);
  if (!r) throw new ApiError("request_not_found", `No request with id ${req.params.id}`, 404);
  if (r.status !== "pending") {
    throw new ApiError("request_not_pending", `Request is ${r.status} and cannot be denied.`, 409);
  }
  r.status = "denied";
  r.deniedAt = new Date().toISOString();
  r.denialReason = req.body?.reason ?? null;
  res.json(r);
}));

// ── Documents ────────────────────────────────────────
app.get("/v1/documents", wrap((req, res) => {
  const empIds = new Set(scoped(req, employees).map((e) => e.id));
  const list = documents.filter((d) => empIds.has(d.employeeId));
  res.json({ data: list });
}));

app.get("/v1/documents/:id", wrap((req, res) => {
  const d = documents.find((x) => x.id === req.params.id);
  if (!d) throw new ApiError("document_not_found", `No document with id ${req.params.id}`, 404);
  res.json(d);
}));

app.post("/v1/documents/:id/sign-url", wrap((req, res) => {
  const d = documents.find((x) => x.id === req.params.id);
  if (!d) throw new ApiError("document_not_found", `No document with id ${req.params.id}`, 404);
  res.json({
    documentId: d.id,
    url: `https://files.example.com/${d.id}.pdf?sig=${crypto.randomBytes(8).toString("hex")}`,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  });
}));

// ── 404 ──────────────────────────────────────────────
app.use((req, res) => {
  sendErr(res, new ApiError("not_found", `No route for ${req.method} ${req.path}`, 404));
});

// ── Start ────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, () => {
  console.log(`benefits-api listening on http://localhost:${PORT}`);
});
