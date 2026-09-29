import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Static web document metadata. Browser APIs are unavailable in this component.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <title>Pointed</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="application-name" content="Pointed" />
        <meta name="description" content="A flexible scoreboard for anything you want to track." />
        <meta name="theme-color" content="#1F1E4D" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Pointed" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          [role="button"]:not([aria-disabled="true"]) { cursor: pointer; }
          [role="button"][aria-disabled="true"] { cursor: default; }
          [role="button"]:not([aria-disabled="true"]):active { opacity: 0.78; }
          @media (prefers-reduced-motion: no-preference) {
            [role="button"] { transition: opacity 90ms ease-out; }
          }
        ` }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
