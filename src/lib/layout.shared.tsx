import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { authorXUrl, gitConfig, npmUrl } from "./shared";

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
    </svg>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span
          className="font-brand-serif"
          style={{
            fontSize: "1.45rem",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Three Start
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        text: "Examples",
        url: "/examples",
      },
      {
        type: "icon",
        text: "X @vladkrutenyuk",
        label: "X @vladkrutenyuk",
        icon: <XIcon />,
        url: authorXUrl,
        external: true,
      },
      {
        type: "icon",
        text: "npm",
        label: "three-start on npm",
        icon: <NpmIcon />,
        url: npmUrl,
        external: true,
      },
    ],
  };
}
