export const ImpactFeedbackStyle = { Light: "light" };
export const NotificationFeedbackType = {
  Error: "error",
  Success: "success",
};

export const impactAsync = jest.fn().mockResolvedValue(undefined);
export const notificationAsync = jest.fn().mockResolvedValue(undefined);
