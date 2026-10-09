import { Metadata } from "next";
import Markdown from "react-markdown";

const TERMS_AND_CONDITIONS_MARKDOWN = `
Put terms and conditions in markdown format here.
`;

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsAndConditions() {
  return (
    <div className="m-auto flex max-w-4xl flex-grow flex-col p-8">
      <h1 className="mb-5 text-3xl font-bold lg:text-5xl">Terms and Conditions</h1>
      <div className="prose max-w-none">
        <Markdown>{TERMS_AND_CONDITIONS_MARKDOWN}</Markdown>
      </div>
    </div>
  );
}
