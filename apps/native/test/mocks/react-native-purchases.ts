/**
 * Jest mock for `react-native-purchases`.
 *
 * The real package is shipped as ESM referencing native modules, so importing it under Jest fails
 * at parse time. Anything that renders a screen touching billing needs this, which is why it is
 * registered globally in `test/setup.ts` rather than per test file.
 *
 * `setCustomerInfo` lets a test put the SDK into the "user owns Pro" state; `resetPurchasesMock`
 * puts it back, and `test/setup.ts` calls it after every test.
 */
export interface MockCustomerInfo {
  entitlements: { active: Record<string, unknown> };
}

const anonymousCustomerInfo = (): MockCustomerInfo => ({ entitlements: { active: {} } });

let customerInfo: MockCustomerInfo = anonymousCustomerInfo();

export const LOG_LEVEL = {
  VERBOSE: "VERBOSE",
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
} as const;

const Purchases = {
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  getCustomerInfo: jest.fn(() => Promise.resolve(customerInfo)),
  getOfferings: jest.fn(() => Promise.resolve({ current: { availablePackages: [] } })),
  logIn: jest.fn(() => Promise.resolve({ customerInfo, created: false })),
  logOut: jest.fn(() => Promise.resolve(customerInfo)),
  restorePurchases: jest.fn(() => Promise.resolve(customerInfo)),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
};

/** Pretend the store says the user holds these entitlement identifiers. */
export function setCustomerInfo(activeEntitlementIds: string[]) {
  customerInfo = {
    entitlements: {
      active: Object.fromEntries(activeEntitlementIds.map((id) => [id, { identifier: id }])),
    },
  };
}

export function resetPurchasesMock() {
  customerInfo = anonymousCustomerInfo();
}

export default Purchases;
