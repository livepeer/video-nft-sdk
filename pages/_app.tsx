import "../styles/globals.css"
import type { AppProps } from "next/app"
import { LivepeerConfig, createReactClient } from "@livepeer/react"
import { WagmiConfig, chain, createClient, configureChains } from "wagmi"

import "@rainbow-me/rainbowkit/styles.css"

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit"

import { publicProvider } from "wagmi/providers/public"
import { infuraProvider } from "wagmi/providers/infura"
import { betaStudioProvider } from "../lib/livepeer"
import { LitProvider } from "../lib/use-lit"

const { chains, provider, webSocketProvider } = configureChains(
  [chain.mainnet, chain.polygon, chain.arbitrum, chain.optimism],
  [
    infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_API_KEY }),
    publicProvider(),
  ]
)

const { connectors } = getDefaultWallets({
  appName: "Mint NFT",
  chains,
})
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider,
})

const client = createReactClient({
  provider: betaStudioProvider(),
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <WagmiConfig client={wagmiClient}>
        <LivepeerConfig client={client}>
          <RainbowKitProvider chains={chains} theme={darkTheme()}>
            <LitProvider>
              <Component {...pageProps} />
            </LitProvider>
          </RainbowKitProvider>
        </LivepeerConfig>
      </WagmiConfig>
    </>
  )
}

export default MyApp
