export type JobRegistration = {
  name: string;
  start: () => Promise<{ stop: () => Promise<void> }>;
};

// The email-delivery lane registers its pg-boss worker here. This registry is
// imported only by the long-lived Node entry point, never by a request handler.
export const jobRegistrations: readonly JobRegistration[] = [];
