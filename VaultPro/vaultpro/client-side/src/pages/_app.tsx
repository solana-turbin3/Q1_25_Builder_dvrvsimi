import type { AppProps } from 'next/app';
import '../styles/globals.css';
import Head from 'next/head';
import App from '../App';

// Buffer polyfill
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || require('buffer').Buffer;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>VaultPro - Multisig Wallet</title>
      </Head>
      {Component.name === 'Home' ? <App /> : <Component {...pageProps} />}
    </>
  );
}

export default MyApp; 