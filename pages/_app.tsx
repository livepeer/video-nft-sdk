import "../styles/globals.css"
import type { AppProps } from "next/app"
import {
  LivepeerConfig,
  createReactClient,
  studioProvider,
  Asset,
  CreateAssetArgs,
} from "@livepeer/react"
import { WagmiConfig, chain, createClient, configureChains } from "wagmi"

import "@rainbow-me/rainbowkit/styles.css"

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit"

import { publicProvider } from "wagmi/providers/public"
import { infuraProvider } from "wagmi/providers/infura"
import { StudioLivepeerProvider } from "livepeer/providers/studio"
import {
  CreateAssetSource,
  CreateAssetSourceType,
  MirrorSizeArray,
} from "livepeer/types"
import {
  FetchOptions,
  LivepeerProviderFn,
} from "livepeer/dist/declarations/src/providers/base"

declare global {
  type AssetPlaybackPolicy = {
    type: "public" | "lit_signing_condition"
    unifiedAccessControlConditions: any[]
    resourceId?: Record<string, string>
  }

  type BetaCreateAssetSource = CreateAssetSource & {
    playbackPolicy?: AssetPlaybackPolicy
  }

  type BetaCreateAssetSourceType =
    | ReadonlyArray<BetaCreateAssetSource>
    | Array<BetaCreateAssetSource>
}

class BetaLivepeerStudioProvider extends StudioLivepeerProvider {
  _extraFields: Record<string, object> = {}

  async createAsset<TSource extends BetaCreateAssetSourceType>(
    args: CreateAssetArgs<TSource>
  ): Promise<MirrorSizeArray<TSource, Asset>> {
    for (const src of args.sources) {
      const { url, file, name, ...extra } = { url: "", file: null, ...src }
      this._extraFields[name] = extra
    }
    return await super.createAsset(args)
  }

  _create<T, P>(
    url: `/${string}`,
    options?: FetchOptions<P> | undefined
  ): Promise<T> {
    const extra = this._extraFields[(options?.json as any)?.name]
    if (extra) {
      options = {
        ...options,
        json: {
          ...options?.json,
          ...extra,
        } as P,
      }
    }
    return super._create(url, options)
  }
}

function betaStudioProvider(): LivepeerProviderFn<BetaLivepeerStudioProvider> {
  return () =>
    new BetaLivepeerStudioProvider({
      name: "Livepeer Studio Beta",
      baseUrl: "https://livepeer.monster/api",
      apiKey: "fbc655bf-8920-43b4-be8c-6dd0c35447a5",
    })
}

const { chains, provider, webSocketProvider } = configureChains(
  [chain.polygon],
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
            <Component {...pageProps} />
          </RainbowKitProvider>
        </LivepeerConfig>
      </WagmiConfig>
    </>
  )
}

export default MyApp
