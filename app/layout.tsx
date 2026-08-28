import "./globals.css";

export const metadata = {
  title: "True Approach Dugout",
  description: "True Approach Dugout, the training portal for True Approach Baseball"
};

const logoUrl = "https://a6defeefbe5ec18834b4.cdn6.editmysite.com/uploads/b/a6defeefbe5ec18834b4ae0b514e538d4f57ff7d613345ef065b5ef7daa9dcfa/TA%20transparent%20PNG_1777845753.png?width=2400&optimize=medium";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="appBrandBar">
          <a className="appBrand" href="/">
            <img className="appBrandLogo" src={logoUrl} alt="True Approach Baseball" />
            <div className="appBrandText">
              <span className="appBrandName">True Approach Dugout</span>
            </div>
          </a>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={{ borderTop: "1px solid #dedfe2", background: "#fff", padding: "28px 16px", textAlign: "center", color: "#6b7280", fontSize: ".88rem" }}>
          © 2026 True Approach Baseball. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
