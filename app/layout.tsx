import "./globals.css";

export const metadata = {
  title: "True Approach Dugout",
  description: "True Approach Dugout, the training portal for True Approach Baseball"
};

const logoUrl = "https://a6defeefbe5ec18834b4.cdn6.editmysite.com/uploads/b/a6defeefbe5ec18834b4ae0b514e538d4f57ff7d613345ef065b5ef7daa9dcfa/TA%20transparent%20PNG_1777845753.png?width=2400&optimize=medium";
const mainSiteUrl = "https://trueapproachbaseball.com";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="appBrandBar">
          <div className="appBrand">
            <a href="/" aria-label="True Approach Dugout home">
              <img className="appBrandLogo" src={logoUrl} alt="True Approach Baseball" />
            </a>
            <div className="appBrandText">
              <a className="appBrandName" href="/">True Approach Dugout</a>
              <a className="appBrandCompany" href={mainSiteUrl}>True Approach Baseball</a>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={{ borderTop: "1px solid #dedfe2", background: "#fff", padding: "28px 16px", textAlign: "center", color: "#6b7280", fontSize: ".88rem" }}>
          © 2026 <a href={mainSiteUrl} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>True Approach Baseball</a>. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
