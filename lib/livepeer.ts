import { Asset, CreateAssetArgs } from "@livepeer/react"
import { StudioLivepeerProvider } from "livepeer/providers/studio"
import {
  CreateAssetSource,
  MirrorSizeArray,
  PlaybackInfo,
} from "livepeer/types"
import {
  FetchOptions,
  LivepeerProviderFn,
} from "livepeer/dist/declarations/src/providers/base"
import { StudioPlaybackInfo } from "livepeer/dist/declarations/src/providers/studio/types"

declare global {
  type AssetPlaybackPolicy = {
    type: "public" | "lit_signing_condition"
    unifiedAccessControlConditions: any[]
    resourceId?: Record<string, string>
  }

  interface BetaAsset extends Asset {
    playbackPolicy: AssetPlaybackPolicy
  }

  type BetaCreateAssetSource = CreateAssetSource & {
    playbackPolicy?: AssetPlaybackPolicy
  }

  type BetaCreateAssetSourceType =
    | ReadonlyArray<BetaCreateAssetSource>
    | Array<BetaCreateAssetSource>

  interface BetaPlaybackInfo extends PlaybackInfo {
    meta: PlaybackInfo["meta"] & {
      playbackPolicy: AssetPlaybackPolicy
    }
  }
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

  _mapToPlaybackInfo(studioPlaybackInfo: StudioPlaybackInfo): PlaybackInfo {
    return {
      ...studioPlaybackInfo,
      meta: {
        ...studioPlaybackInfo?.["meta"],
        live: studioPlaybackInfo?.["meta"]?.["live"]
          ? Boolean(studioPlaybackInfo?.["meta"]["live"])
          : false,
      },
    }
  }
}

export const betaStudioApiKey = "0aa291a2-7c42-47a3-8790-a65294264fb4"

export function betaStudioProvider(): LivepeerProviderFn<BetaLivepeerStudioProvider> {
  return () =>
    new BetaLivepeerStudioProvider({
      name: "Livepeer Studio",
      baseUrl: "https://livepeer.studio/api",
      apiKey: betaStudioApiKey,
    })
}
