
import './globals.css';
import { Providers } from './providers';
import Header from './components/header';
import Footer from './components/footer';

export const metadata = { title: 'Ecom Store', description: 'Next.js + MongoDB Store' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header/>
          <main className="container py-6">{children}</main>
          <Footer/>
        </Providers>
      </body>
    </html>
  );
}
