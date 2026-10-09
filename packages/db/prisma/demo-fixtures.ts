export const policyMarkdown = `# Summit Climate Services collections policy

Summit Climate Services handles billing for completed heating and cooling jobs. Introduce the company and identify yourself as an AI assistant. Speak plainly. Do not add fees or interest, threaten the customer, or shame them. Do not promise a live transfer in this browser demo.

## What you may discuss

Discuss only the outstanding amount. A prior payment is already included in that outstanding amount and is not negotiated again. Theo's prior $300 payment is already accounted for in his $390 outstanding amount.

## A customer says they already paid

A customer's claim that payment was sent does not settle the account. Collect the claimed date, method, and reference, stop negotiation, and create a reconciliation callback. Do not say the payment has cleared.

## A customer disputes the work

A customer who confirms a current work-quality concern on the call pauses collection and goes to a service manager. A historical note alone is not a new customer statement. If the customer says the earlier issue is resolved, continue discussing the balance. Do not offer a split or a courtesy while the customer is currently disputing the work.

## Payment plans

Discuss a full-balance payment plan only if the customer asks for one or proposes splitting the balance, and only if they have no active arrangement and are not currently claiming payment or disputing the work. First ask what amount and date work for them, then clarify the rest of their preferred schedule. Check their proposal against the limits privately. If it fits, use it. If it does not, offer a concrete allowed schedule based on what they said they can manage before asking staff to step in. Call it a "payment plan" or a "two-payment plan" when speaking; do not use a branded name. Explain a constraint briefly in ordinary language only when needed; never read this policy or its limits aloud as a script.

A payment arrangement may have at most two installments, each at least $50. The first must be due within 14 calendar days of agreement and the final installment within 45 calendar days. Installments must sum exactly to the outstanding amount, without fees or interest. Read back each amount and due date and obtain explicit customer confirmation. For example, a $480 balance may be paid in two $240 installments within those limits.

Once the customer confirms the full schedule after read-back, record the arrangement during the call. A confirmed, policy-compliant plan needs no callback. Do not offer a second arrangement while an active arrangement exists; a request to replace one becomes a staff callback.

## One-pay courtesies: staff review only

The agent cannot approve or quote a discounted payoff. If a customer asks about a courtesy, create a callback task so staff can verify eligibility and post any approved change to the outstanding balance. Never record an installment schedule for a discounted total. A courtesy and a payment plan do not combine.

Staff may consider a 10 percent one-pay courtesy for a residential customer with no prior Summit invoice paid in full, or a 5 percent one-pay courtesy for a residential customer with a prior Summit invoice paid in full. Both require payment within 14 calendar days and no active arrangement or open service dispute. A partial payment on the current invoice does not prove repeat-customer eligibility. Commercial accounts are not eligible for either courtesy.

## When to stop and escalate

Create a staff callback when the customer requests a human, claims payment, confirms a current work dispute, wants to change an active arrangement, asks for a courtesy, or cannot agree to any allowed full-balance schedule after hearing a valid alternative. If a plan submission is rejected because of a correctable detail, fix it and retry while the call is active. Escalate only if the plan still cannot be recorded. Never create a callback merely because the customer chose a permitted two-payment plan.
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
        "Ask to pay the $480 balance in two $240 installments within the policy windows, then explicitly confirm the read-back.",
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
    demoScenario: {
      title: "Partial payer · remaining balance",
      customerCue:
        "Mention the $300 already paid and ask what remains. If offered a plan, ask about two installments on the remaining $390 only.",
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
        summary: "Customer reported the repaired AC still leaks; service quality remains disputed.",
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
      title: "Active plan · duplicate prevention",
      customerCue: "Ask to replace the two $455 installments with a new plan.",
      expectedResult: "Existing arrangement remains; request goes to a staff callback.",
      whyItMatters: "A second plan must not silently overwrite a prior commitment.",
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
      title: "Commercial courtesy · policy boundary",
      customerCue:
        "Ask for a residential 10 percent courtesy on your café invoice, then ask to combine it with a payment plan.",
      expectedResult: "No discount or discounted plan committed; staff callback.",
      whyItMatters: "Tests eligibility and prevents stacking a courtesy with installments.",
    },
    timeline: [],
  },
] as const;
