import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PortalProtectedRoute from "./components/PortalProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Branches from "./pages/Branches";
import Members from "./pages/Members";
import Groups from "./pages/Groups";
import LoanProducts from "./pages/LoanProducts";
import LoanApplications from "./pages/LoanApplications";
import Loans from "./pages/Loans";
import Savings from "./pages/Savings";
import Expenses from "./pages/Expenses";
import FieldOfficers from "./pages/FieldOfficers";
import Meetings from "./pages/Meetings";
import Notifications from "./pages/Notifications";
import Donors from "./pages/Donors";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Payments from "./pages/Payments";

import PortalLogin from "./pages/portal/PortalLogin";
import PortalRegister from "./pages/portal/PortalRegister";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalApplyLoan from "./pages/portal/PortalApplyLoan";
import PortalLoanApplications from "./pages/portal/PortalLoanApplications";
import PortalLoans from "./pages/portal/PortalLoans";
import PortalSavings from "./pages/portal/PortalSavings";
import PortalPaymentResult from "./pages/portal/PortalPaymentResult";
import PortalMockPayment from "./pages/portal/PortalMockPayment";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/branches"
        element={
          <ProtectedRoute>
            <Branches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <Groups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loan-products"
        element={
          <ProtectedRoute>
            <LoanProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loan-applications"
        element={
          <ProtectedRoute>
            <LoanApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <Loans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/savings"
        element={
          <ProtectedRoute>
            <Savings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/field-officers"
        element={
          <ProtectedRoute>
            <FieldOfficers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute>
            <Meetings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donors"
        element={
          <ProtectedRoute>
            <Donors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Payments />
          </ProtectedRoute>
        }
      />

      {/* Borrower Portal - separate auth system from the staff app above */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/register" element={<PortalRegister />} />
      <Route
        path="/portal/mock-payment/:tranId"
        element={
          <PortalProtectedRoute>
            <PortalMockPayment />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/dashboard"
        element={
          <PortalProtectedRoute>
            <PortalDashboard />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/apply"
        element={
          <PortalProtectedRoute>
            <PortalApplyLoan />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/loan-applications"
        element={
          <PortalProtectedRoute>
            <PortalLoanApplications />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/loans"
        element={
          <PortalProtectedRoute>
            <PortalLoans />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/savings"
        element={
          <PortalProtectedRoute>
            <PortalSavings />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/portal/payments/result"
        element={
          <PortalProtectedRoute>
            <PortalPaymentResult />
          </PortalProtectedRoute>
        }
      />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
