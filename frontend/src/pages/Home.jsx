import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import Assistant from "../components/Assistant";

export default function Home() {
  return (
    <div>
      <PublicNav />

      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">12 branches across the country</span>
          <h1>
            Small loans, <em>made simple.</em>
          </h1>
          <p>
            MFNet Foundation gives small loans to people who cannot get one from a bank. Borrowers
            and staff share the same clear record of every loan, payment, and receipt.
          </p>
        </div>
      </section>

      {/* Two doors. Borrowers and staff need different things, so each side
          gets its own card saying who it is for and what is inside. */}
      <div className="doors">
        <div className="door">
          <div className="door-tag">For borrowers</div>
          <h2>Borrower Portal</h2>
          <p>Your own account. Apply, check, and pay from your phone.</p>
          <ul className="door-list">
            <li>Apply for a loan and see which step it is at</li>
            <li>See how much you owe and when it is due</li>
            <li>Pay by card, without going to a branch</li>
            <li>Open a savings account and add money any time</li>
          </ul>
          <div className="door-actions">
            <Link to="/portal/login" className="btn btn-primary">
              Borrower login
            </Link>
            <Link to="/portal/register" className="btn btn-ghost">
              Set up access
            </Link>
          </div>
        </div>

        <div className="door">
          <div className="door-tag">For MFNet staff</div>
          <h2>Staff and Admin</h2>
          <p>The system staff use to run the day-to-day work.</p>
          <ul className="door-list">
            <li>Add members, check ID papers, and manage groups</li>
            <li>Set up loan types, approve loans, and give out money</li>
            <li>Track savings, costs, donors, and meetings</li>
            <li>See reports, payments, and a full activity log</li>
          </ul>
          <div className="door-actions">
            <Link to="/login" className="btn btn-primary">
              Staff login
            </Link>
            <Link to="/register" className="btn btn-ghost">
              Register staff
            </Link>
          </div>
        </div>
      </div>

      <section className="section section-tight">
        <div className="section-heading">
          <span className="section-eyebrow">About us</span>
          <h2>Fair loans, kept in the open</h2>
          <p>
            MFNet Foundation works with families, farmers, shop owners, and small traders across 12
            branches. Anyone who needs a small loan can apply, and the rules are the same for
            everyone.
          </p>
        </div>

        <div className="card-grid">
          <div className="info-card">
            <h3>Group lending</h3>
            <p>
              Borrowers join small groups. A loan officer helps the group from the first form all
              the way to the last payment.
            </p>
          </div>
          <div className="info-card">
            <h3>Clear approvals</h3>
            <p>
              Every loan goes through set approval steps. Bigger loans are checked by more people.
              You can always see which step your loan is at.
            </p>
          </div>
          <div className="info-card">
            <h3>Savings</h3>
            <p>
              You can save with us too. Putting aside a little at a time helps your family when
              money is tight.
            </p>
          </div>
          <div className="info-card">
            <h3>Pay from anywhere</h3>
            <p>
              Pay your instalments and add to savings by card from the portal. Every payment is
              checked with the bank before it is counted.
            </p>
          </div>
        </div>
      </section>

      <section className="impact-panel">
        <div className="impact-inner">
          <p className="impact-disclaimer">Example numbers — made up, for this demo only</p>
          <div className="impact-stats">
            <div className="impact-stat">
              <span className="num">12</span>
              <span className="label">Branches</span>
            </div>
            <div className="impact-stat">
              <span className="num">4,800+</span>
              <span className="label">Members</span>
            </div>
            <div className="impact-stat">
              <span className="num">৳ 62M</span>
              <span className="label">Loans given out</span>
            </div>
            <div className="impact-stat">
              <span className="num">96%</span>
              <span className="label">Paid on time</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} MFNet Foundation · A CSE470 course project, BRAC University</p>
      </footer>

      <Assistant audience="public" />
    </div>
  );
}
