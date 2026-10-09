export const policyMarkdown = `# Summit Climate Services collections policy

Summit Climate Services handles billing for completed heating and cooling jobs. Introduce the company and identify yourself as an AI assistant. Speak plainly. Do not add fees or interest, threaten the customer, or shame them. Do not promise a live transfer in this browser demo.

## What you may discuss

Discuss only the outstanding amount shown on the selected account. Any prior payment is already reflected in that balance and is not negotiated again.

## A customer says they already paid

A customer's claim that payment was sent does not settle the account. Collect the claimed date, method, and reference, stop negotiation, and create a reconciliation callback. Do not say the payment has cleared.

## A customer disputes the work

A customer who asks for service review of an unresolved work-quality concern pauses collection and goes to a service manager. A historical note alone is not a new customer statement. If the customer says the earlier issue is resolved, continue discussing the balance. If the customer is upset about bad service but wants to settle the invoice with one payment, the service-recovery discount below may be offered instead. Do not press for payment when the customer asks to have the work fixed or the charge reviewed.

## Payment plans

Discuss a full-balance payment plan only if the customer asks for one or proposes splitting the balance, and only if they have no active arrangement and are not currently claiming payment or disputing the work. First ask what amount and date work for them, then clarify the rest of their preferred schedule. Check their proposal against the limits privately. If it fits, use it. If it does not, offer a concrete allowed schedule based on what they said they can manage before asking staff to step in. Call it a "payment plan" or a "two-payment plan" when speaking; do not use a branded name. Explain a constraint briefly in ordinary language only when needed; never read this policy or its limits aloud as a script.

A payment arrangement may have at most two installments, each at least $50. The first must be due within 14 calendar days of agreement and the final installment within 45 calendar days. Installments must sum exactly to the outstanding amount, without fees or interest. For example, a $500 balance may be paid in two $250 installments within those limits. A customer who states a complete schedule they can pay has agreed to those terms; submit it promptly without a redundant final confirmation. If the agent fills in or changes a material amount or date, state the complete proposed terms once and obtain the customer's agreement before submitting.

Once the customer agrees to the full schedule, record the arrangement during the call. An agreed, policy-compliant plan needs no callback. On an account with an active arrangement, begin with the existing payment dates and amounts. Ask whether the next scheduled payment has been sent or remains on track; do not start by asking for a new plan or the full balance. If the customer says they sent a payment, record an unverified payment claim for reconciliation rather than marking it paid. If they confirm the plan is on track, record a check-in without changing the balance or schedule.

If the customer requests a change to an active arrangement, ask what amounts and dates now work. A replacement schedule may be recorded during the call when it covers the current outstanding balance and meets the same installment, minimum-payment, and timing limits measured from the amendment date. If the customer states a complete valid replacement, submit it promptly. If the agent fills in or changes a material term, state the complete replacement once and obtain agreement before submitting. Replace the active schedule atomically and retain the prior schedule in history. Do not leave two active plans or create a staff callback for a valid amendment. If the replacement cannot meet policy, offer a valid alternative before requesting staff review.

## Service-recovery one-payment discount

If the customer personally reports bad service or dissatisfaction during this call and says they are willing to settle the invoice in one payment, the agent may offer a 10 percent service-recovery discount on the current outstanding balance. This applies to residential and commercial customers. Do not raise service quality or offer this discount proactively at the start of the call. A historical complaint note alone does not qualify. Do not combine the discount with a payment plan, an existing arrangement, or another discount. A customer who claims they already paid is not eligible until staff reconciles that claim.

Calculate the discount as 10 percent of the outstanding balance, rounded to the nearest cent with half-cent values rounded up. The one discounted payment is due within 14 calendar days of agreement. State the original outstanding balance, the exact discount, the exact one-payment amount, and its due date. Record a discounted-payoff promise once the customer agrees to that exact amount and date; do not ask for a second final confirmation. No callback is needed for an agreed, valid discounted payoff. The outstanding balance does not change until the payment is actually received and applied. A request for a different discount or more time goes to staff.

## When to stop and escalate

Create a staff callback when the customer requests a human, claims payment, requests review of a current work dispute, requests an unsupported discount, or cannot agree to any allowed full-balance schedule after hearing a valid alternative. If a plan, amendment, or discounted-payoff submission is rejected because of a correctable detail, fix it and retry while the call is active. Escalate only if the outcome still cannot be recorded. Never create a callback merely because the customer confirmed an existing plan, chose a permitted two-payment plan, accepted a valid amendment, or confirmed the permitted one-payment service-recovery discount.
`;

export const cases = [
  {
    key: "maria",
    customerName: "Maria Ellis",
    authorizedContactName: "Maria Ellis",
    billingEmail: "maria.ellis@example.com",
    invoiceNumber: "DEMO-2026-0812-ME",
    outstandingAmount: "480.00",
    originalAmount: "480.00",
    invoiceDate: "2026-08-12",
    serviceDate: "2026-08-10",
    serviceDescription: "AC capacitor replacement",
    customerType: "residential",
    authorizedContactRole: "Customer",
    demoScenario: {
      title: "First contact · workable split",
      customerCue:
        "Ask to pay the $480 balance in two $240 installments on specific dates within the policy windows. The agent should submit once you have agreed to the complete schedule, without a second confirmation question.",
      expectedResult: "Arrangement recorded; balance stays $480 until a real payment is posted.",
      whyItMatters: "Shows a clean resolution without treating a promise as payment.",
    },
    timeline: [],
  },
  {
    key: "theo",
    customerName: "Theo Ramirez",
    authorizedContactName: "Theo Ramirez",
    billingEmail: "theo.ramirez@example.com",
    invoiceNumber: "DEMO-2026-0805-TR",
    outstandingAmount: "390.00",
    originalAmount: "690.00",
    invoiceDate: "2026-08-05",
    serviceDate: "2026-08-03",
    serviceDescription: "Duct repair",
    customerType: "residential",
    authorizedContactRole: "Customer",
    staffNote:
      "Demo payment history: Original invoice $690.00; $300.00 payment recorded on August 22, 2026; $390.00 remains outstanding. Do not collect the $300.00 again.",
    demoScenario: {
      title: "Partial payer · remaining balance",
      customerCue:
        "Mention the $300 already paid and ask what remains. If you want a plan, ask about two installments on the remaining $390 only.",
      expectedResult: "Agent states $390 remaining and never re-collects the $300 payment.",
      whyItMatters: "Tests that prior payments are context, not a second amount due.",
    },
    timeline: [
      {
        id: "demo:theo:partial-payment",
        type: "partial_payment",
        occurredAt: "2026-08-22T14:00:00.000Z",
        summary: "Prior $300 payment recorded; $390 remains outstanding.",
        amount: "300.00",
      },
    ],
    priorCalls: [
      {
        id: "demo:theo:prior-call",
        occurredAt: "2026-08-22T14:10:00.000Z",
        summary:
          "Customer asked how the $300 payment affected the invoice; staff confirmed $390 remained.",
        transcriptText:
          "[customer 0-3000ms] I paid $300 toward the duct repair. What is still open?\n[assistant 3000-7000ms] The $300 is reflected on the invoice. The remaining balance is $390.\n[customer 7000-9000ms] Thanks, I will review the rest.\n",
      },
    ],
  },
  {
    key: "keisha",
    customerName: "Keisha Patel",
    authorizedContactName: "Keisha Patel",
    billingEmail: "keisha.patel@example.com",
    invoiceNumber: "DEMO-2026-0719-KP",
    outstandingAmount: "1140.00",
    originalAmount: "1140.00",
    invoiceDate: "2026-07-19",
    serviceDate: "2026-07-17",
    serviceDescription: "AC leak repair",
    customerType: "residential",
    authorizedContactRole: "Customer",
    demoScenario: {
      title: "Unresolved repair · service review",
      customerCue:
        "Say the indoor unit still leaks after the repair and water stained the ceiling. Ask for a service manager.",
      expectedResult: "Work-quality dispute, collections paused, service-manager follow-up.",
      whyItMatters: "A documented complaint must stop payment negotiation.",
    },
    timeline: [
      {
        id: "demo:keisha:leak-complaint",
        type: "complaint",
        occurredAt: "2026-08-02T15:30:00.000Z",
        summary:
          "Customer reported a leak after repair; no service-manager review was requested on that call.",
      },
    ],
    priorCalls: [
      {
        id: "demo:keisha:prior-call",
        occurredAt: "2026-08-02T15:30:00.000Z",
        summary:
          "Keisha mentioned a possible continuing leak; staff noted it without a review request.",
        transcriptText:
          "[customer 0-4000ms] I noticed water near the indoor unit again after the repair. I need to check whether it is still leaking.\n[assistant 4000-8000ms] I will note that concern. If you want a service manager to review it, please let us know.\n[customer 8000-10000ms] I will check it and call back if needed.\n",
      },
    ],
  },
  {
    key: "jordan",
    customerName: "Jordan Kim",
    authorizedContactName: "Jordan Kim",
    billingEmail: "jordan.kim@example.com",
    invoiceNumber: "DEMO-2026-0725-JK",
    outstandingAmount: "760.00",
    originalAmount: "760.00",
    invoiceDate: "2026-07-25",
    serviceDate: "2026-07-24",
    serviceDescription: "Furnace blower motor replacement",
    customerType: "residential",
    authorizedContactRole: "Customer",
    demoScenario: {
      title: "Already paid claim · reconciliation",
      customerCue:
        "Say you sent a bank transfer on October 2 with reference JK-2048 and do not want to pay twice.",
      expectedResult:
        "Payment claim recorded as unverified; reconciliation follow-up; no paid status.",
      whyItMatters:
        "The agent must trust neither the invoice view nor an unverified claim as final proof.",
    },
    timeline: [
      {
        id: "demo:jordan:reminder",
        type: "prior_email",
        occurredAt: "2026-08-15T13:00:00.000Z",
        summary: "Invoice reminder sent; no payment receipt recorded.",
      },
      {
        id: "demo:jordan:transfer-context",
        type: "staff_note",
        occurredAt: "2026-10-02T16:00:00.000Z",
        summary: "Customer mentioned a possible bank transfer; it has not been reconciled.",
      },
    ],
    priorCalls: [
      {
        id: "demo:jordan:prior-call",
        occurredAt: "2026-10-02T16:00:00.000Z",
        summary: "Jordan said a bank transfer might be sent and would check the bank details.",
        transcriptText:
          "[customer 0-3000ms] I may send a bank transfer for this invoice today. I need to check with my bank first.\n[assistant 3000-7000ms] Understood. I do not have a payment receipt on the account yet.\n[customer 7000-9000ms] I will call if I see it go through.\n",
      },
    ],
    priorEmails: [
      {
        id: "demo:jordan:reminder-email",
        occurredAt: "2026-08-15T13:00:00.000Z",
        subject: "Reminder: furnace repair invoice DEMO-2026-0725-JK",
        body: "Hello Jordan,\n\nOur records show $760.00 outstanding for the furnace blower motor replacement. Please contact Summit Climate Services if your payment is already in progress.\n\nSummit Climate Services",
      },
    ],
  },
  {
    key: "northside",
    customerName: "Northside Dental LLC",
    authorizedContactName: "Avery Morgan",
    billingEmail: "billing@northsidedental.example",
    invoiceNumber: "DEMO-2026-0630-ND",
    outstandingAmount: "2250.00",
    originalAmount: "2250.00",
    invoiceDate: "2026-06-30",
    serviceDate: "2026-06-27",
    serviceDescription: "Rooftop unit repair",
    customerType: "commercial",
    authorizedContactRole: "Office manager, authorized billing contact",
    demoScenario: {
      title: "Commercial account · human callback",
      customerCue:
        "Mention that the prior reminder reached the receptionist, then ask to speak with a human about the invoice.",
      expectedResult: "Staff callback task rather than a live transfer or new arrangement.",
      whyItMatters: "Shows the agent stops negotiating when a customer asks for a person.",
    },
    timeline: [
      {
        id: "demo:northside:receptionist",
        type: "prior_call",
        occurredAt: "2026-09-15T14:00:00.000Z",
        summary: "Receptionist answered; no account or job details were disclosed.",
      },
    ],
    priorCalls: [
      {
        id: "demo:northside:prior-call",
        occurredAt: "2026-09-15T14:00:00.000Z",
        summary: "Receptionist answered and directed future billing calls to Avery Morgan.",
        transcriptText:
          "[customer 0-3000ms] Northside Dental front desk. Avery handles the billing, but they are unavailable.\n[assistant 3000-6000ms] Thank you. I will note that Avery is the right contact and call again later.\n",
      },
    ],
    priorEmails: [
      {
        id: "demo:northside:reminder-email",
        occurredAt: "2026-09-16T13:00:00.000Z",
        subject: "Rooftop unit invoice DEMO-2026-0630-ND",
        body: "Hello Avery,\n\nOur records show $2,250.00 outstanding for the rooftop unit repair. Please contact Summit Climate Services to discuss the invoice.\n\nSummit Climate Services",
      },
    ],
  },
  {
    key: "cedar",
    customerName: "Cedar Bakery LLC",
    authorizedContactName: "Elena Brooks",
    billingEmail: "owner@cedarbakery.example",
    invoiceNumber: "DEMO-2026-0730-CB",
    outstandingAmount: "910.00",
    originalAmount: "910.00",
    invoiceDate: "2026-07-30",
    serviceDate: "2026-07-29",
    serviceDescription: "Air handler service",
    customerType: "commercial",
    authorizedContactRole: "Owner, authorized billing contact",
    demoScenario: {
      title: "Active plan · amendment",
      customerCue:
        "After the agent reviews the two existing $455 payments, ask to move the second due date from November 6 to November 20 while keeping both $455 amounts. State that this complete replacement schedule works for you.",
      expectedResult:
        "Active arrangement amended in place; original schedule retained in history; no callback.",
      whyItMatters: "The agent can adapt an existing commitment without creating a duplicate plan.",
    },
    existingArrangement: {
      status: "active",
      confirmedAt: "2026-09-25T17:00:00.000Z",
      scheduledTotal: "910.00",
      installments: [
        { dueDate: "2026-10-23", amount: "455.00" },
        { dueDate: "2026-11-06", amount: "455.00" },
      ],
    },
    timeline: [
      {
        id: "demo:cedar:existing-arrangement",
        type: "prior_call",
        occurredAt: "2026-09-25T17:00:00.000Z",
        summary:
          "Existing $910 arrangement confirmed with owner; two $455 installments remain scheduled.",
      },
    ],
    priorCalls: [
      {
        id: "demo:cedar:prior-call",
        occurredAt: "2026-09-25T17:00:00.000Z",
        summary: "Elena confirmed two $455 payments for October 23 and November 6.",
        outcomeKind: "arrangement",
        transcriptText:
          "[customer 0-3000ms] Could I split the $910 into two payments?\n[assistant 3000-7000ms] Would $455 on October 23 and $455 on November 6 work?\n[customer 7000-10000ms] Yes, I agree to those two $455 payments on those dates.\n",
      },
    ],
    priorEmails: [
      {
        id: "demo:cedar:plan-email",
        occurredAt: "2026-09-25T17:10:00.000Z",
        subject: "Confirmed payment arrangement for DEMO-2026-0730-CB",
        body: "Hello Elena,\n\nThis confirms your $910.00 payment arrangement: $455.00 due October 23 and $455.00 due November 6. These payments have not yet been received.\n\nSummit Climate Services",
      },
    ],
  },
  {
    key: "samira",
    customerName: "Samira Ortiz",
    authorizedContactName: "Samira Ortiz",
    billingEmail: "samira.ortiz@example.com",
    invoiceNumber: "DEMO-2026-0818-SO",
    outstandingAmount: "640.00",
    originalAmount: "640.00",
    invoiceDate: "2026-08-18",
    serviceDate: "2026-08-16",
    serviceDescription: "Heat pump condensate pump replacement",
    customerType: "residential",
    authorizedContactRole: "Customer",
    demoScenario: {
      title: "Hardship · unsupported schedule",
      customerCue:
        "Explain you can manage only four $160 monthly payments, with the last due about four months from now. Ask the agent to make an exception.",
      expectedResult: "No unsupported plan recorded; staff callback for a policy exception.",
      whyItMatters:
        "Shows empathy and a firm boundary when the policy does not fit the customer's situation.",
    },
    timeline: [
      {
        id: "demo:samira:reminder",
        type: "prior_email",
        occurredAt: "2026-09-16T15:00:00.000Z",
        summary: "Reminder sent; customer replied that cash flow is tight and requested a call.",
      },
    ],
    priorEmails: [
      {
        id: "demo:samira:reminder-email",
        occurredAt: "2026-09-16T15:00:00.000Z",
        subject: "Heat pump service invoice DEMO-2026-0818-SO",
        body: "Hello Samira,\n\nOur records show $640.00 outstanding for your heat pump condensate pump replacement. Please contact Summit Climate Services if you need to discuss the balance.\n\nSummit Climate Services",
      },
    ],
  },
  {
    key: "harbor",
    customerName: "Harbor Coffee Co.",
    authorizedContactName: "Nina Shah",
    billingEmail: "nina@harborcoffee.example",
    invoiceNumber: "DEMO-2026-0826-HC",
    outstandingAmount: "1280.00",
    originalAmount: "1280.00",
    invoiceDate: "2026-08-26",
    serviceDate: "2026-08-23",
    serviceDescription: "Walk-in cooler compressor service",
    customerType: "commercial",
    authorizedContactRole: "Owner, authorized billing contact",
    demoScenario: {
      title: "Unsupported discount · policy boundary",
      customerCue:
        "Ask for a 10 percent discount on your café invoice without raising a service concern, then ask to combine it with a payment plan.",
      expectedResult: "No discount or discounted plan committed; staff callback.",
      whyItMatters: "Tests eligibility and prevents stacking a courtesy with installments.",
    },
    timeline: [
      {
        id: "demo:harbor:reminder",
        type: "prior_email",
        occurredAt: "2026-09-20T13:00:00.000Z",
        summary: "Invoice reminder sent; no service complaint or discount request was recorded.",
      },
    ],
    priorEmails: [
      {
        id: "demo:harbor:reminder-email",
        occurredAt: "2026-09-20T13:00:00.000Z",
        subject: "Cooler service invoice DEMO-2026-0826-HC",
        body: "Hello Nina,\n\nOur records show $1,280.00 outstanding for the walk-in cooler compressor service. Please contact Summit Climate Services to discuss the invoice.\n\nSummit Climate Services",
      },
    ],
  },
  {
    key: "riley",
    customerName: "Riley Chen",
    authorizedContactName: "Riley Chen",
    billingEmail: "riley.chen@example.com",
    invoiceNumber: "DEMO-2026-0821-RC",
    outstandingAmount: "900.00",
    originalAmount: "900.00",
    invoiceDate: "2026-08-21",
    serviceDate: "2026-08-19",
    serviceDescription: "Heat pump repair with a delayed return visit",
    customerType: "residential",
    authorizedContactRole: "Customer",
    demoScenario: {
      title: "Bad service · one-payment settlement",
      customerCue:
        "Say the repair visit was frustrating and the technician had to come back, but you can settle the bill in one payment if there is a discount. Agree once to the exact $810 discounted payoff and due date.",
      expectedResult:
        "10 percent service-recovery discount and one-payment promise recorded; no callback or claim that payment was received.",
      whyItMatters:
        "Shows the agent can resolve a service complaint when the customer wants to settle instead of requesting a service review.",
    },
    timeline: [
      {
        id: "demo:riley:return-visit",
        type: "prior_call",
        occurredAt: "2026-08-20T14:00:00.000Z",
        summary:
          "Customer discussed a delayed return visit; no current-call settlement request was made.",
      },
    ],
    priorCalls: [
      {
        id: "demo:riley:prior-call",
        occurredAt: "2026-08-20T14:00:00.000Z",
        summary: "Riley asked when the technician would return after the delayed repair visit.",
        transcriptText:
          "[customer 0-3000ms] The heat pump appointment ran late. When is the technician coming back?\n[assistant 3000-6000ms] The return visit is scheduled for tomorrow morning.\n[customer 6000-9000ms] Okay. I hope it gets finished then.\n",
      },
    ],
  },
] as const;
