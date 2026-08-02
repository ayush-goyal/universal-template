/**
 * Jest mock for `react-native-purchases-ui`.
 *
 * `presentPaywallIfNeeded` defaults to `NOT_PRESENTED`, the outcome for a user who already has the
 * entitlement — a test that wants a purchase should override it with `mockResolvedValueOnce`.
 */
export const PAYWALL_RESULT = {
  NOT_PRESENTED: "NOT_PRESENTED",
  ERROR: "ERROR",
  CANCELLED: "CANCELLED",
  PURCHASED: "PURCHASED",
  RESTORED: "RESTORED",
} as const;

const RevenueCatUI = {
  presentPaywall: jest.fn(() => Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)),
  presentPaywallIfNeeded: jest.fn(() => Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)),
};

export default RevenueCatUI;
