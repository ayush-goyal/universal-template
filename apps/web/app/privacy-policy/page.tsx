import { Metadata } from "next";
import Markdown from "react-markdown";

const PRIVACY_POLICY_MARKDOWN = `
Put privacy policy in markdown format here.
`;

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicy() {
  return (
    <div className="m-auto flex max-w-4xl flex-grow flex-col p-8">
      <h1 className="mb-5 text-3xl font-bold lg:text-5xl">Privacy Policy</h1>
      <div className="prose max-w-none">
        <Markdown>{PRIVACY_POLICY_MARKDOWN}</Markdown>
      </div>
    </div>
  );
}
