import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, authorXUrl, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        text: "Examples",
        url: "/examples",
      },
      {
        text: "X @vladkrutenyuk",
        url: authorXUrl,
        external: true,
      },
    ],
  };
}
