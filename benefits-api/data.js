// In-memory seed data. Backed by Postgres in production.

const companies = [
  {
    id: "cmp_01",
    legalName: "Sobchak Security LLC",
    dba: "Sobchak Security",
    ein: "85-2244719",
    addressLine1: "608 Venezia Ave",
    city: "Venice",
    state: "CA",
    postalCode: "90291",
    plan: "complete",
    payrollFrequency: "biweekly",
    nextPayDate: "2026-05-22",
  },
  {
    id: "cmp_02",
    legalName: "Lebowski Bowling Inc.",
    dba: "Hollywood Star Lanes",
    ein: "95-3008812",
    addressLine1: "5227 Santa Monica Blvd",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90029",
    plan: "core",
    payrollFrequency: "semimonthly",
    nextPayDate: "2026-05-31",
  },
];

const employees = [
  {
    id: "emp_2204",
    companyId: "cmp_01",
    firstName: "Walter",
    lastName: "Sobchak",
    email: "walter@sobchaksecurity.example",
    title: "Owner",
    department: "Operations",
    employmentType: "salary",
    annualSalaryCents: 14500000,
    startDate: "2018-03-01",
    status: "active",
    ssnLast4: "9921",
    dob: "1942-04-12",
  },
  {
    id: "emp_2205",
    companyId: "cmp_01",
    firstName: "Donny",
    lastName: "Kerabatsos",
    email: "donny@sobchaksecurity.example",
    title: "Field Tech",
    department: "Operations",
    employmentType: "hourly",
    hourlyRateCents: 3200,
    startDate: "2021-09-14",
    status: "active",
    ssnLast4: "1043",
    dob: "1962-11-02",
  },
  {
    id: "emp_3101",
    companyId: "cmp_02",
    firstName: "Jeffrey",
    lastName: "Lebowski",
    email: "jeff@starlanes.example",
    title: "General Manager",
    department: "Management",
    employmentType: "salary",
    annualSalaryCents: 8200000,
    startDate: "2019-01-07",
    status: "active",
    ssnLast4: "5099",
    dob: "1969-07-18",
  },
];

const payrolls = [
  {
    id: "pay_2026_10",
    companyId: "cmp_01",
    periodStart: "2026-04-27",
    periodEnd: "2026-05-10",
    payDate: "2026-05-15",
    status: "paid",
    grossCents: 412300,
    netCents: 304100,
    taxesCents: 78200,
    deductionsCents: 30000,
    employees: ["emp_2204", "emp_2205"],
  },
  {
    id: "pay_2026_11",
    companyId: "cmp_01",
    periodStart: "2026-05-11",
    periodEnd: "2026-05-24",
    payDate: "2026-05-29",
    status: "processing",
    grossCents: 418900,
    netCents: 308700,
    taxesCents: 79400,
    deductionsCents: 30800,
    employees: ["emp_2204", "emp_2205"],
  },
];

const benefits = [
  { id: "ben_med_ppo", type: "medical", name: "Anthem Blue PPO 1000", carrier: "Anthem", monthlyPremiumCents: 64200 },
  { id: "ben_med_hsa", type: "medical", name: "Kaiser HSA 2500", carrier: "Kaiser", monthlyPremiumCents: 48900 },
  { id: "ben_dent", type: "dental", name: "Guardian Dental Plus", carrier: "Guardian", monthlyPremiumCents: 4800 },
  { id: "ben_vis", type: "vision", name: "VSP Choice", carrier: "VSP", monthlyPremiumCents: 1100 },
  { id: "ben_401k", type: "retirement", name: "Sobchak 401(k)", carrier: "Guideline", monthlyPremiumCents: 0 },
];

const enrollments = [
  {
    id: "enr_01",
    employeeId: "emp_2204",
    benefitId: "ben_med_ppo",
    dependents: ["spouse"],
    employeeContributionCents: 21000,
    employerContributionCents: 43200,
    effectiveDate: "2025-01-01",
    status: "active",
  },
  {
    id: "enr_02",
    employeeId: "emp_2205",
    benefitId: "ben_med_hsa",
    dependents: [],
    employeeContributionCents: 12000,
    employerContributionCents: 36900,
    effectiveDate: "2025-01-01",
    status: "active",
  },
];

const contributions = [
  {
    id: "ct_01",
    employeeId: "emp_2204",
    type: "401k_traditional",
    percent: 6,
    employerMatchPercent: 4,
    periodId: "pay_2026_10",
    amountCents: 27000,
  },
];

const timeOffPolicies = [
  { id: "pol_pto", name: "Paid Time Off", type: "pto", accrualHoursPerPayPeriod: 6, maxBalanceHours: 200 },
  { id: "pol_sick", name: "Sick Leave", type: "sick", accrualHoursPerPayPeriod: 2, maxBalanceHours: 80 },
];

const timeOffBalances = [
  { employeeId: "emp_2204", policyId: "pol_pto", balanceHours: 122.5 },
  { employeeId: "emp_2204", policyId: "pol_sick", balanceHours: 41 },
  { employeeId: "emp_2205", policyId: "pol_pto", balanceHours: 38 },
  { employeeId: "emp_2205", policyId: "pol_sick", balanceHours: 22 },
];

const timeOffRequests = [
  {
    id: "tor_01",
    employeeId: "emp_2205",
    policyId: "pol_pto",
    startDate: "2026-06-09",
    endDate: "2026-06-13",
    hours: 32,
    status: "pending",
    reason: "Family trip",
  },
];

const documents = [
  { id: "doc_w4_2204", employeeId: "emp_2204", type: "W-4", year: 2026, uploadedAt: "2026-01-08T17:22:00Z" },
  { id: "doc_i9_2204", employeeId: "emp_2204", type: "I-9", year: 2018, uploadedAt: "2018-03-01T09:12:00Z" },
];

module.exports = {
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
};
