// Offline fallback for the MFNet assistant.
//
// The chatbot's first choice is always the configured AI provider. This
// module is what answers when that isn't possible: no AI_API_KEY set, the
// key rejected, a quota exhausted, the network down, or a request timeout.
//
// It is a small keyword matcher over MFNet's own subject matter, not an
// attempt at general conversation. The point is that a demo, a viva, or a
// marking session never hits a dead chat window because of an expired
// credential - the assistant drops back to something still useful and still
// on topic. Answers are written in plain English, like the rest of the app.
//
// Every reply here is written to be true of this codebase specifically.
const TOPICS = [
  {
    keys: ["apply", "application", "new loan", "request a loan", "borrow"],
    reply:
      "To ask for a loan, log in to the Borrower Portal and open **Apply for a Loan**. Choose a loan type, put in how much you need and what it is for, then send it. You cannot ask for more than that loan type allows. After you send it, you will see it under **My Applications**.",
  },
  {
    keys: ["status", "approved", "approval", "pending", "how long", "decision"],
    reply:
      "Open **My Applications** in the portal. Each one shows where it has reached. Small loans are checked by a loan officer. Bigger loans are also checked by a branch manager, and the biggest by an admin. Nobody can tell you the answer before those checks are done.",
  },
  {
    keys: ["pay", "payment", "repay", "installment", "instalment", "due", "card"],
    reply:
      "Open **My Loans**, tap the loan you want to pay, and choose **Pay this instalment**. You put your card details into a secure Stripe form. We check the payment with the bank first. Once it goes through, the amount you owe goes down and that instalment is marked as paid.",
  },
  {
    keys: ["savings", "deposit", "save", "account balance"],
    reply:
      "Go to **My Savings** in the portal. If you do not have an account yet, you can open one there. After that you can add money by card any time. Your balance goes up as soon as the payment is confirmed.",
  },
  {
    keys: ["guarantor", "collateral", "security", "witness"],
    reply:
      "A guarantor is a person who agrees to pay your loan if you cannot. Collateral is something you own that is written down against the loan, like a machine or some land. MFNet staff add both while they check your form, so you do not enter them yourself.",
  },
  {
    keys: ["interest", "rate", "how much extra", "cost"],
    reply:
      "Each loan type has its own interest rate and length. You can see both when you pick a loan type on the apply page. Your schedule under **My Loans** splits the total into dated payments, so you can see exactly what is due and when.",
  },
  {
    keys: ["kyc", "verify", "verification", "national id", "nid", "document"],
    reply:
      "KYC just means checking who you are before money is given out. Staff write down your national ID and your papers at the branch. Your KYC status shows at the top of the portal. If it still says pending, ask your loan officer what is missing.",
  },
  {
    keys: ["register", "sign up", "portal access", "activate", "password"],
    reply:
      "You cannot sign up on your own. Staff must add you as a member first. After that, go to **Set up portal access**, put in the national ID and phone number the branch already has for you, and pick a password. If they do not match our records, it will not let you in.",
  },
  {
    keys: ["overdue", "late", "missed", "default", "behind"],
    reply:
      "A payment you missed is marked late and shows in red on your schedule. You can still pay it from **My Loans**. If paying is hard right now, talk to your branch early. You will have more choices then than if you wait.",
  },
  {
    keys: ["staff", "officer", "admin", "branch", "contact", "help", "human"],
    reply:
      "For anything about your own records - a decision, a mistake, a paper you need - talk to your branch or your loan officer. Staff use a different system from this portal and can see your full history.",
  },
  {
    keys: ["disburse", "receive", "when do i get", "money"],
    reply:
      "You get the money after your form passes every approval step. At that point the loan is created, your payment schedule is made, and a loan agreement is saved. The loan then shows up under **My Loans**.",
  },
];

const GREETINGS = ["hi", "hello", "hey", "salam", "assalamu", "good morning", "good afternoon", "good evening"];

function fallbackReply(message) {
  const text = String(message || "").toLowerCase().trim();

  if (!text) {
    return "Ask me anything about your loans, forms, savings, or payments at MFNet.";
  }

  if (GREETINGS.some((g) => text === g || text.startsWith(g + " ") || text.startsWith(g + ","))) {
    return "Hello. I can help with loan forms, payment dates, savings, and paying by card. What would you like to know?";
  }

  // Score each topic by how many of its keywords appear, so a question that
  // touches two topics resolves to the stronger match rather than the first.
  let best = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const score = topic.keys.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }

  if (best) return best.reply;

  return (
    "I am not sure about that one. I can help you apply for a loan, check where your form has reached, " +
    "understand your payment dates, pay an instalment, or open a savings account. " +
    "For anything about your own records, your branch or loan officer is the quickest way."
  );
}

module.exports = { fallbackReply };
