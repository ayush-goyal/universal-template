const mockConfigure = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockGetAppUserID = jest.fn();
const mockGetOfferings = jest.fn();
const mockLogIn = jest.fn();
const mockLogOut = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    getAppUserID: (...args: unknown[]) => mockGetAppUserID(...args),
    getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
    logIn: (...args: unknown[]) => mockLogIn(...args),
    logOut: (...args: unknown[]) => mockLogOut(...args),
  },
}));

jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  default: {
    presentPaywall: jest.fn(),
    presentCustomerCenter: jest.fn(),
  },
  PAYWALL_RESULT: {
    NOT_PRESENTED: "NOT_PRESENTED",
    ERROR: "ERROR",
    CANCELLED: "CANCELLED",
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
  },
}));

describe("RevenueCat client", () => {
  it("supports anonymous purchases before linking an authenticated account", async () => {
    mockGetCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    mockGetAppUserID.mockResolvedValue("$RCAnonymousID:test");
    mockGetOfferings.mockResolvedValue({ current: { availablePackages: [] } });
    mockLogIn.mockResolvedValue({ customerInfo: {}, created: true });
    mockLogOut.mockResolvedValue({});

    const { initializeRevenueCat, logOutRevenueCat } =
      jest.requireActual<typeof import("@/libs/revenueCat")>("@/libs/revenueCat");

    await initializeRevenueCat("appl_public");
    expect(mockConfigure).toHaveBeenCalledWith({ apiKey: "appl_public" });
    expect(mockGetCustomerInfo.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockConfigure.mock.invocationCallOrder[0]!
    );

    await initializeRevenueCat("appl_public", "user-1");
    expect(mockLogIn).toHaveBeenCalledWith("user-1");

    await logOutRevenueCat();
    expect(mockLogOut).toHaveBeenCalledTimes(1);
  });
});
