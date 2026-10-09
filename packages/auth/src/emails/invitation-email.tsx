import * as React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";

export default function InvitationEmail({
  organizationName,
  inviteLink,
}: {
  organizationName: string;
  inviteLink: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Invitation to {organizationName}</Preview>
      <Body>
        <Container>
          <Heading>Join {organizationName}</Heading>
          <Text>You have been invited to work with {organizationName}.</Text>
          <Text>
            <Link href={inviteLink}>Accept your invitation</Link>
          </Text>
          <Text>If you did not expect this invitation, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
