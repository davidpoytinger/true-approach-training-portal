import "./globals.css";

export const metadata = {
  title: "True Approach Dugout",
  description: "True Approach Dugout, the training portal for True Approach Baseball"
};

const logoUrl = "https://a6defeefbe5ec18834b4.cdn6.editmysite.com/uploads/b/a6defeefbe5ec18834b4ae0b514e538d4f57ff7d613345ef065b5ef7daa9dcfa/TA%20transparent%20PNG_1777845753.png?width=2400&optimize=medium";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="appBrandBar">
          <a className="appBrand" href="/">
            <img className="appBrandLogo" src={logoUrl} alt="True Approach Baseball" />
            <div className="appBrandText">
              <span className="appBrandName">True Approach Dugout</span>
              <span className="appBrandCompany">True Approach Baseball</span>
            </div>
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
