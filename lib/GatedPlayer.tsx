import {
  LivepeerProvider,
  Player,
  PlayerProps,
  usePlaybackInfo,
} from "@livepeer/react"
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react"
import { useAccount } from "wagmi"
import { betaStudioApiKey } from "./livepeer"
import { useLit, LitJsSdk } from "./use-lit"

async function checkLitGate(
  litNodeClient: any,
  playbackId: string,
  playbackUrl: URL,
  playbackPolicy: AssetPlaybackPolicy
) {
  if (playbackPolicy.type !== "lit_signing_condition") {
    throw new Error("not a lit gated asset")
  }

  // console.log("resolving")
  // TODO: Compute and sign other chains based on conditions
  const ethSig = await LitJsSdk.checkAndSignAuthMessage({
    chain: "ethereum",
    switchChain: false,
  })
  // console.log("ethSig", ethSig)

  const jwt = await litNodeClient.getSignedToken({
    unifiedAccessControlConditions:
      playbackPolicy.unifiedAccessControlConditions,
    authSig: { ethereum: ethSig },
    resourceId: playbackPolicy.resourceId,
  })
  // console.log("jwt", jwt)

  const res = await fetch(
    `${playbackUrl.protocol}//${playbackUrl.host}/verify-lit-jwt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${betaStudioApiKey}`,
      },
      body: JSON.stringify({ playbackId, jwt }),
      credentials: "include",
    }
  )
  // console.log("verify jwt", res)
  if (!res.ok) {
    const { errors } = await res.json()
    throw new Error(errors[0])
  }
}

const GatedPlayer: FunctionComponent<
  {
    playbackId: string
  } & Exclude<PlayerProps, "src">
> = ({ playbackId, ...props }) => {
  const { address } = useAccount()
  const { litNodeClient, litConnected } = useLit()

  const [gatingError, setGatingError] = useState<string>()
  const [gateState, setGateState] = useState<"open" | "closed" | "checking">()

  // Step 1: Fetch playback URL
  const {
    data: playbackInfo,
    status: playbackInfoStatus,
    error: pinfoError,
  } = usePlaybackInfo<LivepeerProvider, BetaPlaybackInfo>({
    playbackId,
  })
  const playbackUrl = useMemo(() => {
    try {
      return new URL(
        playbackInfo?.meta?.source?.find(
          (s) => s.type === "html5/application/vnd.apple.mpegurl"
        )?.url ?? ""
      )
    } catch {
      return null
    }
  }, [playbackInfo])

  // Step 2: Check Lit signing condition and obtain playback cookie
  useEffect(() => {
    if (playbackInfoStatus !== "success" || !playbackId) return

    const { playbackPolicy } = playbackInfo?.meta ?? {}
    if (playbackPolicy?.type !== "lit_signing_condition") {
      setGateState("open")
      return
    }
    setGateState("checking")

    if (!address || !litConnected || !playbackUrl) {
      // console.log("not ready to check gate")
      return
    }

    // console.log("checking gating conditions", playbackInfo)
    checkLitGate(litNodeClient, playbackId, playbackUrl, playbackPolicy)
      .then(() => setGateState("open"))
      .catch((err: any) => {
        const msg = err?.message || err
        setGatingError(
          `You are not allowed to view this content. Gate error: ${msg}`
        )
        setGateState("closed")
      })
  }, [
    address,
    litNodeClient,
    litConnected,
    playbackInfoStatus,
    playbackInfo,
    playbackId,
    playbackUrl,
  ])

  // UI state integration

  const readyToPlay = useMemo(
    () =>
      address &&
      playbackInfoStatus === "success" &&
      (playbackInfo?.meta?.playbackPolicy?.type !== "lit_signing_condition" ||
        gateState === "open"),
    [address, playbackInfoStatus, playbackInfo, gateState]
  )

  return (
    <>
      {readyToPlay ? (
        <div className="flex flex-col justify-center items-center ml-5 font-matter">
          <div className="border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 lg:w-3/4 w-100 font-matter">
            <Player
              src={playbackUrl?.toString()}
              allowCrossOriginCredentials={true}
              controls={{ defaultVolume: 1 }}
              autoPlay={true}
              {...props}
            />
          </div>
        </div>
      ) : !address ? (
        <p>Please connect your wallet</p>
      ) : pinfoError || (gateState === "closed" && gatingError) ? (
        <p className="text-red-600">{gatingError || pinfoError?.message}</p>
      ) : (
        <p>Checking gate...</p>
      )}
    </>
  )
}

export default GatedPlayer
