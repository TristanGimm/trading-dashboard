import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'GIMM · Trading Intelligence',description:'Private automated trading analytics for GIMM Holding',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className="antialiased">{children}</body></html>}
