
import './globals.css';
import { Providers } from './providers';
import Header from './components/header';

export const metadata = { title: 'Ecom Store', description: 'Next.js + MongoDB Store' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header/>
          <main className="container py-6">{children}</main>
          <footer className="container py-10 text-sm text-gray-500">© {new Date().getFullYear()} Ecom Store</footer>
        </Providers>
      </body>
    </html>
  );
}
