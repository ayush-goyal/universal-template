import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ReminderEmailProps {
  taskTitle: string;
  taskUrl: string;
  dueLabel?: string;
}

export default function ReminderEmail({
  taskTitle = "Pay rent",
  taskUrl = "https://example.com/app/inbox",
  dueLabel,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Reminder: ${taskTitle}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 py-8" style={main}>
          <Container className="mx-auto max-w-[600px] rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
            <Heading className="mt-0 text-center text-2xl font-bold text-gray-900">
              You have a task due
            </Heading>
            <Text className="my-4 text-base leading-6 text-gray-700">{taskTitle}</Text>
            {dueLabel ? <Text className="my-2 text-sm text-gray-500">{dueLabel}</Text> : null}
            <Section className="my-8 text-center">
              <Button
                href={taskUrl}
                className="rounded-md bg-black px-5 py-3 text-center text-sm font-bold text-white no-underline"
              >
                Open task
              </Button>
            </Section>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-sm text-gray-500">
              You're receiving this because you set a reminder on this task.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const main = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};
