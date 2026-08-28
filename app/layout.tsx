import "./globals.css";

export const metadata = {
  title: "True Approach Dugout",
  description: "True Approach Dugout, the training portal for True Approach Baseball"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="appBrandBar">
          <a className="appBrand" href="/">
            <img className="appBrandLogo" src="/true-approach-logo.png" alt="True Approach Baseball" />
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
