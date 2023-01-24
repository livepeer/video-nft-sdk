import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { LivepeerConfig, createReactClient, studioProvider } from '@livepeer/react';
import { WagmiConfig, chain, createClient, configureChains } from 'wagmi';

import '@rainbow-me/rainbowkit/styles.css';

import { getDefaultWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

import { publicProvider } from 'wagmi/providers/public';
import { infuraProvider } from 'wagmi/providers/infura';
import Script from 'next/script';

const { chains, provider, webSocketProvider } = configureChains(
  [ chain.polygon],
  [infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_API_KEY }),
  publicProvider(),
]);

const { connectors } = getDefaultWallets({
  appName: 'Mint NFT',
  chains,
});
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider,
});

const client = createReactClient({
  provider: studioProvider({ apiKey: process.env.NEXT_PUBLIC_API_CORS }),
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script id='google-tag-manager' strategy='afterInteractive'>
        {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_CODE}');
      `}
      </Script>

      <WagmiConfig client={wagmiClient}>
        <LivepeerConfig client={client}>
          <RainbowKitProvider chains={chains} theme={darkTheme()}>
            <Component {...pageProps} />
          </RainbowKitProvider>
        </LivepeerConfig>
      </WagmiConfig>
    </>
  );
}

export default MyApp;
