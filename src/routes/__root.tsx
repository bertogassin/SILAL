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
      { name: "robots", content: "noindex" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "description",
        content: "SILAL — help your people know their people. Silsila, Tukhum, wallet, SILAL coin.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,400&family=Unbounded:wght@500&display=swap",
      },
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
