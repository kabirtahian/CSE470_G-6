#!/usr/bin/env node
/**
 * Seeds the database with realistic Bangladeshi microfinance demo data so
 * the app has something to show: branches, staff, groups, members, loan
 * products/applications/loans (at various approval stages, some disbursed
 * with part-paid/overdue schedules), savings accounts, donors, expenses,
 * meetings and notifications.
 *
 * Reuses the app's own approval-stage (utils/loanWorkflow) and
 * disbursement/schedule math (loanController.disburse) so the seeded rows
 * stay consistent with what the real workflow would produce.
 *
 * Run once against a freshly created database:
 *   cd backend && node scripts/seed-bd-demo.js
 *
 * Refuses to run again if "Dhaka Branch" already exists, so it can't
 * double-seed by accident.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const {
  sequelize,
  User,
  Branch,
  Member,
  Group,
  LoanProduct,
  LoanApplication,
  ApprovalStep,
  Loan,
  RepaymentSchedule,
  Transaction,
  Notification,
  SavingsAccount,
  Donor,
  Contribution,
  Expense,
  Meeting,
} = require("../src/models");
const { getRequiredStages } = require("../src/utils/loanWorkflow");

const STAFF_PASSWORD = "Password123!";
const MEMBER_PORTAL_PASSWORD = "Member@123";

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function today(offsetDays = 0) {
  return addDays(new Date().toISOString().slice(0, 10), offsetDays);
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function phoneFor(seed) {
  return "017" + String(10000000 + seed * 97).slice(-8);
}
function nidFor(seed) {
  return String(1990000000000 + seed * 8191).slice(0, 13);
}

async function main() {
  await sequelize.authenticate();
  console.log("Connected to database.");

  const already = await Branch.findOne({ where: { branchName: "Dhaka Branch" } });
  if (already) {
    console.log('Demo data already present ("Dhaka Branch" exists) - not seeding again.');
    process.exit(0);
  }

  const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 10);

  // ---------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------
  const branchDefs = [
    { branchName: "Dhaka Branch", address: "House 24, Road 5, Mirpur-10, Dhaka-1216", contactNumber: "02-9012345" },
    { branchName: "Chattogram Branch", address: "Agrabad Commercial Area, Chattogram-4100", contactNumber: "031-2233445" },
    { branchName: "Sylhet Branch", address: "Zindabazar Point, Sylhet-3100", contactNumber: "0821-712233" },
  ];
  const branches = [];
  for (const b of branchDefs) branches.push(await Branch.create(b));
  console.log(`Created ${branches.length} branches.`);

  // ---------------------------------------------------------------
  // Staff
  // ---------------------------------------------------------------
  const staffDefs = [
    { fullName: "Md. Tanvir Ahmed", email: "admin.tanvir@mfnet.bd", role: "admin", branch: null },
    { fullName: "Farzana Yasmin", email: "farzana.yasmin@mfnet.bd", role: "branch_manager", branch: 0 },
    { fullName: "Shahriar Kabir", email: "shahriar.kabir@mfnet.bd", role: "branch_manager", branch: 1 },
    { fullName: "Nusrat Jahan", email: "nusrat.jahan@mfnet.bd", role: "branch_manager", branch: 2 },
    { fullName: "Mahmudul Hasan", email: "mahmudul.hasan@mfnet.bd", role: "loan_officer", branch: 0 },
    { fullName: "Taslima Akter", email: "taslima.akter@mfnet.bd", role: "loan_officer", branch: 0 },
    { fullName: "Sabbir Rahman", email: "sabbir.rahman@mfnet.bd", role: "loan_officer", branch: 1 },
    { fullName: "Ripon Chandra Das", email: "ripon.das@mfnet.bd", role: "loan_officer", branch: 1 },
    { fullName: "Golam Mostofa", email: "golam.mostofa@mfnet.bd", role: "loan_officer", branch: 2 },
    { fullName: "Moushumi Rani Das", email: "moushumi.das@mfnet.bd", role: "loan_officer", branch: 2 },
    { fullName: "Rezaul Karim", email: "rezaul.karim@mfnet.bd", role: "cashier", branch: 0 },
    { fullName: "Shirin Sultana", email: "shirin.sultana@mfnet.bd", role: "cashier", branch: 1 },
    { fullName: "Aminul Islam", email: "aminul.islam@mfnet.bd", role: "cashier", branch: 2 },
  ];
  const staff = {};
  let staffSeed = 1;
  for (const s of staffDefs) {
    staff[s.email] = await User.create({
      fullName: s.fullName,
      email: s.email,
      passwordHash: staffPasswordHash,
      phone: phoneFor(staffSeed++ + 900),
      role: s.role,
      branchId: s.branch === null ? null : branches[s.branch].id,
    });
  }
  console.log(`Created ${staffDefs.length} staff users (password for all: ${STAFF_PASSWORD}).`);

  const admin = staff["admin.tanvir@mfnet.bd"];
  const branchManagers = [staff["farzana.yasmin@mfnet.bd"], staff["shahriar.kabir@mfnet.bd"], staff["nusrat.jahan@mfnet.bd"]];
  const loanOfficersByBranch = [
    [staff["mahmudul.hasan@mfnet.bd"], staff["taslima.akter@mfnet.bd"]],
    [staff["sabbir.rahman@mfnet.bd"], staff["ripon.das@mfnet.bd"]],
    [staff["golam.mostofa@mfnet.bd"], staff["moushumi.das@mfnet.bd"]],
  ];

  // ---------------------------------------------------------------
  // Groups (2 per branch, one per loan officer)
  // ---------------------------------------------------------------
  const groupDefs = [
    { name: "Progoti Mohila Samity", branch: 0, officer: 0 },
    { name: "Alor Disha Samity", branch: 0, officer: 1 },
    { name: "Sagorika Nari Dal", branch: 1, officer: 0 },
    { name: "Notun Alo Samabay", branch: 1, officer: 1 },
    { name: "Sobuj Bangla Samity", branch: 2, officer: 0 },
    { name: "Chatak Nari Sangathan", branch: 2, officer: 1 },
  ];
  const groups = [];
  for (const g of groupDefs) {
    groups.push(
      await Group.create({
        groupName: g.name,
        branchId: branches[g.branch].id,
        loanOfficerId: loanOfficersByBranch[g.branch][g.officer].id,
      })
    );
  }
  console.log(`Created ${groups.length} groups.`);

  // ---------------------------------------------------------------
  // Members (8 per branch = 4 per group), Bengali names + BD addresses
  // ---------------------------------------------------------------
  const memberDefs = [
    // Dhaka (branch 0) - group 0 then group 1
    { name: "Md. Abdul Karim", address: "Vill: Kaundia, Union: Bhabanipur, Savar, Dhaka", branch: 0, group: 0 },
    { name: "Rahima Begum", address: "House 7, Mirpur-11, Dhaka", branch: 0, group: 0 },
    { name: "Md. Rafiqul Islam", address: "Vill: Joypara, Nawabganj, Dhaka", branch: 0, group: 0 },
    { name: "Fatema Khatun", address: "Aganagar, Keraniganj, Dhaka", branch: 0, group: 0 },
    { name: "Md. Shahjahan Mia", address: "Vill: Charabag, Dhamrai, Dhaka", branch: 0, group: 1 },
    { name: "Nasrin Akter", address: "Sector 11, Uttara, Dhaka", branch: 0, group: 1 },
    { name: "Sujon Mia", address: "Vill: Bhakurta, Savar, Dhaka", branch: 0, group: 1 },
    { name: "Salma Begum", address: "Demra, Dhaka", branch: 0, group: 1 },
    // Chattogram (branch 1)
    { name: "Md. Jashim Uddin", address: "Vill: Patiya Bazar, Patiya, Chattogram", branch: 1, group: 2 },
    { name: "Rina Akter", address: "Kumira, Sitakunda, Chattogram", branch: 1, group: 2 },
    { name: "Dipankar Roy", address: "Anwara Sadar, Chattogram", branch: 1, group: 2 },
    { name: "Shahnaz Parveen", address: "Vill: Rangunia, Chattogram", branch: 1, group: 2 },
    { name: "Md. Kamal Hossain", address: "Hathazari Bazar, Chattogram", branch: 1, group: 3 },
    { name: "Beauty Akter", address: "Boalkhali, Chattogram", branch: 1, group: 3 },
    { name: "Bikash Chandra Sarkar", address: "Vill: Fatikchhari, Chattogram", branch: 1, group: 3 },
    { name: "Sultana Razia", address: "Mirsharai, Chattogram", branch: 1, group: 3 },
    // Sylhet (branch 2)
    { name: "Md. Iqbal Hasan", address: "Zindabazar, Sylhet Sadar", branch: 2, group: 4 },
    { name: "Ayesha Siddiqua", address: "Beanibazar, Sylhet", branch: 2, group: 4 },
    { name: "Md. Habibur Rahman", address: "Companiganj, Sylhet", branch: 2, group: 4 },
    { name: "Jesmin Akter", address: "Vill: Golapganj, Sylhet", branch: 2, group: 4 },
    { name: "Md. Faruk Hossain", address: "Fenchuganj, Sylhet", branch: 2, group: 5 },
    { name: "Rupali Rani Das", address: "Bishwanath, Sylhet", branch: 2, group: 5 },
    { name: "Md. Selim Reza", address: "Jaintiapur, Sylhet", branch: 2, group: 5 },
    { name: "Hosne Ara Begum", address: "Kanaighat, Sylhet", branch: 2, group: 5 },
  ];

  const members = [];
  for (let i = 0; i < memberDefs.length; i += 1) {
    const m = memberDefs[i];
    const birthYear = 1965 + rand(0, 35);
    const dob = `${birthYear}-${String(rand(1, 12)).padStart(2, "0")}-${String(rand(1, 28)).padStart(2, "0")}`;
    const joinDate = addDays(today(), -rand(60, 900));
    const kycStatus = i % 9 === 0 ? "pending" : "verified";
    const member = await Member.create({
      fullName: m.name,
      nationalId: nidFor(i + 1),
      address: m.address,
      phone: phoneFor(i + 1),
      dob,
      joinDate,
      kycStatus,
      branchId: branches[m.branch].id,
      groupId: groups[m.group].id,
    });
    members.push({ row: member, branch: m.branch, group: m.group, name: m.name });
  }
  console.log(`Created ${members.length} members.`);

  function loanOfficerForMember(memberIdx) {
    const g = groupDefs[members[memberIdx].group];
    return loanOfficersByBranch[g.branch][g.officer];
  }

  // ---------------------------------------------------------------
  // Loan products
  // ---------------------------------------------------------------
  const loanProductDefs = [
    { productName: "Small Business Loan", interestRate: 12.5, maxAmount: 100000, tenureMonths: 12, productType: "group" },
    { productName: "Agriculture Loan", interestRate: 10.0, maxAmount: 150000, tenureMonths: 18, productType: "group" },
    { productName: "Emergency Loan", interestRate: 15.0, maxAmount: 30000, tenureMonths: 6, productType: "individual" },
    { productName: "Home Improvement Loan", interestRate: 13.0, maxAmount: 250000, tenureMonths: 24, productType: "individual" },
  ];
  const products = [];
  for (const p of loanProductDefs) products.push(await LoanProduct.create(p));
  console.log(`Created ${products.length} loan products.`);

  // ---------------------------------------------------------------
  // Helpers for loan applications / approvals / disbursement
  // ---------------------------------------------------------------
  async function approveStage(application, stage, approver, decisionValue, comments) {
    await ApprovalStep.create({
      loanApplicationId: application.id,
      stage,
      decision: decisionValue,
      comments,
      approverId: approver.id,
    });
    if (decisionValue === "rejected") {
      await application.update({ status: "rejected" });
    } else {
      const nextIndex = application.currentStageIndex + 1;
      const requiredStages = getRequiredStages(application.requestedAmount);
      await application.update({
        currentStageIndex: nextIndex,
        status: nextIndex >= requiredStages.length ? "approved" : "pending",
      });
    }
  }

  async function disburseLoan(application, product, { monthsAgo, paid = 0, overdue = 0, memberName, groupLoanOfficerId }) {
    const principal = Number(application.requestedAmount);
    const interestRate = Number(product.interestRate);
    const tenureMonths = product.tenureMonths;
    const disbursedDate = addMonths(today(), -monthsAgo);

    const loan = await Loan.create({
      loanApplicationId: application.id,
      principal,
      interestRate,
      tenureMonths,
      disbursedDate,
      status: "active",
      outstandingBalance: principal,
    });

    const totalPayable = principal + principal * (interestRate / 100) * (tenureMonths / 12);
    const installmentAmount = Math.round((totalPayable / tenureMonths) * 100) / 100;

    let outstandingBalance = principal;
    for (let i = 1; i <= tenureMonths; i += 1) {
      const dueDate = addMonths(disbursedDate, i);
      let status = "pending";
      if (i <= paid) status = "paid";
      else if (i <= paid + overdue) status = "overdue";

      const row = await RepaymentSchedule.create({
        loanId: loan.id,
        installmentNo: i,
        dueDate,
        amountDue: installmentAmount,
        status,
      });

      if (status === "paid") {
        await Transaction.create({
          loanId: loan.id,
          amount: installmentAmount,
          category: "repayment",
          transactionType: "loan_repayment",
          transactionDate: dueDate,
        });
        outstandingBalance = Math.max(0, outstandingBalance - installmentAmount);
      } else if (status === "overdue" && groupLoanOfficerId) {
        await Notification.create({
          recipientId: groupLoanOfficerId,
          message: `Installment #${row.installmentNo} for ${memberName} (loan #${loan.id}) is overdue.`,
          channel: "in_app",
          status: "unread",
        });
      }
    }

    await loan.update({ outstandingBalance, status: paid >= tenureMonths ? "closed" : "active" });
    return loan;
  }

  async function createApplication(memberIdx, productIdx, amount, purpose) {
    return LoanApplication.create({
      memberId: members[memberIdx].row.id,
      loanProductId: products[productIdx].id,
      requestedAmount: amount,
      purpose,
      applicationDate: addDays(today(), -rand(20, 200)),
    });
  }

  // ---------------------------------------------------------------
  // Loan applications: approved & disbursed (with varied repayment progress)
  // ---------------------------------------------------------------
  const disbursedScenarios = [
    { memberIdx: 0, productIdx: 0, amount: 45000, purpose: "Grocery shop stock", monthsAgo: 8, paid: 7, overdue: 1 },
    { memberIdx: 1, productIdx: 2, amount: 25000, purpose: "Medical emergency", monthsAgo: 7, paid: 6, overdue: 0 },
    { memberIdx: 8, productIdx: 1, amount: 120000, purpose: "Paddy cultivation", monthsAgo: 4, paid: 3, overdue: 0 },
    { memberIdx: 9, productIdx: 0, amount: 80000, purpose: "Tailoring shop expansion", monthsAgo: 5, paid: 5, overdue: 0 },
    { memberIdx: 16, productIdx: 3, amount: 180000, purpose: "Tin-shed house repair", monthsAgo: 6, paid: 5, overdue: 1 },
    { memberIdx: 17, productIdx: 2, amount: 28000, purpose: "Daughter's school admission", monthsAgo: 2, paid: 2, overdue: 0 },
  ];
  for (const s of disbursedScenarios) {
    const application = await createApplication(s.memberIdx, s.productIdx, s.amount, s.purpose);
    const branchIdx = members[s.memberIdx].branch;
    const stages = getRequiredStages(s.amount);
    for (const stage of stages) {
      const approver = stage === "loan_officer" ? loanOfficerForMember(s.memberIdx) : stage === "branch_manager" ? branchManagers[branchIdx] : admin;
      await approveStage(application, stage, approver, "approved", "Meets group guarantee and repayment capacity.");
    }
    await disburseLoan(application, products[s.productIdx], {
      monthsAgo: s.monthsAgo,
      paid: s.paid,
      overdue: s.overdue,
      memberName: members[s.memberIdx].name,
      groupLoanOfficerId: loanOfficerForMember(s.memberIdx).id,
    });
  }
  console.log(`Disbursed ${disbursedScenarios.length} loans with repayment schedules.`);

  // Awaiting admin stage (big loan, both earlier stages already approved)
  {
    const memberIdx = 2;
    const application = await createApplication(memberIdx, 3, 220000, "Rebuilding storm-damaged house");
    const branchIdx = members[memberIdx].branch;
    await approveStage(application, "loan_officer", loanOfficerForMember(memberIdx), "approved", "Verified damage, recommended.");
    await approveStage(application, "branch_manager", branchManagers[branchIdx], "approved", "Concur with loan officer's recommendation.");
    // left pending at the admin stage on purpose
  }

  // Pending at loan_officer stage (freshly submitted, no decisions yet)
  for (const memberIdx of [3, 10, 18]) {
    await createApplication(memberIdx, 0, 40000, "Poultry farming");
  }

  // Pending at branch_manager stage (loan officer already signed off)
  for (const memberIdx of [4, 11]) {
    const application = await createApplication(memberIdx, 1, 90000, "Vegetable cultivation");
    const branchIdx = members[memberIdx].branch;
    await approveStage(application, "loan_officer", loanOfficerForMember(memberIdx), "approved", "Group meeting attendance good, recommended.");
    void branchIdx; // stays pending for the branch manager to decide
  }

  // Rejected applications
  {
    const application5 = await createApplication(5, 0, 35000, "Open a tea stall");
    await approveStage(application5, "loan_officer", loanOfficerForMember(5), "rejected", "Existing loan with another MFI not disclosed initially.");

    const application12 = await createApplication(12, 1, 130000, "Shrimp farming");
    const bm = branchManagers[members[12].branch];
    await approveStage(application12, "loan_officer", loanOfficerForMember(12), "approved", "Recommended.");
    await approveStage(application12, "branch_manager", bm, "rejected", "Land ownership documents for the pond were inconclusive.");

    const application19 = await createApplication(19, 2, 20000, "Sewing machine repair");
    await approveStage(application19, "loan_officer", loanOfficerForMember(19), "rejected", "Repayment capacity insufficient given existing group loan.");
  }
  console.log("Created loan applications across pending / approved / rejected states.");

  // ---------------------------------------------------------------
  // Savings accounts + a few transactions per member
  // ---------------------------------------------------------------
  for (let i = 0; i < members.length; i += 1) {
    const balance = rand(500, 15000);
    const account = await SavingsAccount.create({
      memberId: members[i].row.id,
      balance,
      openDate: members[i].row.joinDate,
      status: "active",
    });
    const depositCount = rand(1, 3);
    for (let d = 0; d < depositCount; d += 1) {
      await Transaction.create({
        savingsAccountId: account.id,
        amount: rand(200, 3000),
        category: "deposit",
        transactionType: "savings_deposit",
        transactionDate: addDays(today(), -rand(5, 300)),
      });
    }
    if (i % 5 === 0) {
      await Transaction.create({
        savingsAccountId: account.id,
        amount: rand(200, 1500),
        category: "withdrawal",
        transactionType: "savings_withdrawal",
        transactionDate: addDays(today(), -rand(1, 60)),
      });
    }
  }
  console.log(`Created ${members.length} savings accounts with transactions.`);

  // ---------------------------------------------------------------
  // Donors + contributions
  // ---------------------------------------------------------------
  const donorDefs = [
    { donorName: "Palli Karma-Sahayak Foundation (PKSF)", contactInfo: "pksf@pksf-bd.org, 02-8181903" },
    { donorName: "BRAC Foundation", contactInfo: "info@bracfoundation.org, 02-9881265" },
    { donorName: "Bangladesh Bank Microfinance Fund", contactInfo: "microfinance@bb.org.bd" },
    { donorName: "Manusher Jonno Foundation", contactInfo: "info@manusherjonno.org, 02-9126937" },
  ];
  for (const d of donorDefs) {
    const donor = await Donor.create(d);
    const contributionCount = rand(1, 2);
    for (let c = 0; c < contributionCount; c += 1) {
      await Contribution.create({
        donorId: donor.id,
        branchId: branches[rand(0, branches.length - 1)].id,
        amount: rand(300000, 2500000),
        contributionDate: addDays(today(), -rand(30, 540)),
      });
    }
  }
  console.log(`Created ${donorDefs.length} donors with contributions.`);

  // ---------------------------------------------------------------
  // Expenses per branch
  // ---------------------------------------------------------------
  const expenseCategories = [
    { category: "Office Rent", range: [25000, 40000] },
    { category: "Staff Salary", range: [150000, 300000] },
    { category: "Utility Bill", range: [3000, 8000] },
    { category: "Travel Allowance", range: [2000, 6000] },
    { category: "Stationery & Printing", range: [1500, 4000] },
  ];
  for (const branch of branches) {
    for (const ec of expenseCategories) {
      await Expense.create({
        branchId: branch.id,
        category: ec.category,
        amount: rand(ec.range[0], ec.range[1]),
        expenseDate: addDays(today(), -rand(1, 90)),
        description: `${ec.category} - ${branch.branchName}`,
      });
    }
  }
  console.log(`Created ${branches.length * expenseCategories.length} expense records.`);

  // ---------------------------------------------------------------
  // Meetings per group
  // ---------------------------------------------------------------
  for (const group of groups) {
    await Meeting.create({
      groupId: group.id,
      scheduledDate: new Date(addDays(today(), -14)),
      location: `${group.groupName} meeting point`,
      status: "completed",
    });
    await Meeting.create({
      groupId: group.id,
      scheduledDate: new Date(addDays(today(), 7)),
      location: `${group.groupName} meeting point`,
      status: "scheduled",
    });
  }
  console.log(`Created ${groups.length * 2} meetings.`);

  // ---------------------------------------------------------------
  // Borrower Portal access for a few members (one per branch)
  // ---------------------------------------------------------------
  const portalMemberIdxs = [0, 8, 16];
  const portalPasswordHash = await bcrypt.hash(MEMBER_PORTAL_PASSWORD, 10);
  const portalCreds = [];
  for (const idx of portalMemberIdxs) {
    await members[idx].row.update({ passwordHash: portalPasswordHash });
    portalCreds.push({ name: members[idx].name, nationalId: members[idx].row.nationalId });
  }

  console.log("\nSeed complete.\n");
  console.log("Staff login (any user below), password for all: " + STAFF_PASSWORD);
  console.log("  admin.tanvir@mfnet.bd (admin)");
  console.log("  farzana.yasmin@mfnet.bd (branch manager, Dhaka)");
  console.log("  mahmudul.hasan@mfnet.bd (loan officer, Dhaka)");
  console.log("\nBorrower Portal login, password: " + MEMBER_PORTAL_PASSWORD);
  for (const c of portalCreds) console.log(`  ${c.name} - National ID: ${c.nationalId}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
