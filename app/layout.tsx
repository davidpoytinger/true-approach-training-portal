import "./globals.css";

export const metadata = {
  title: "True Approach Training",
  description: "True Approach Baseball training portal"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
