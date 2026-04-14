import './globals.css';

export const metadata = {
  title: 'TOEFL iBT Mock Test — English with Arik',
  description: 'Official-style TOEFL iBT mock tests aligned to the January 2026 format. Practice Reading, Listening, Writing, and Speaking with adaptive scoring.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
