import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiProvider } from "@/components/si/provider";
import appCss from "../styles.css?url";

const APP_NAME = "SILAL";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0B1F1A" },
      { name: "referrer", content: "no-referrer" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "description",
        content: "SILAL — help your people know their people. Silsila, Tukhum, wallet, SILAL coin.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="ce" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <SiProvider>
            <Outlet />
          </SiProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
