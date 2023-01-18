import Head from "next/head"
import { useMemo, useState, useEffect } from "react"
import { LivepeerProvider } from "@livepeer/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import styles from "../../styles/MintNFT.module.css"
import "lit-share-modal-v3/dist/ShareModal.css"
import LitJsSdk from "lit-js-sdk"
import { useRouter } from "next/router"
import { usePlaybackInfo } from "@livepeer/react/hooks"
import useLit from "../../lib/use-lit"
import GatedPlayer from "../../lib/GatedPlayer"
import { betaStudioApiKey } from "../../lib/livepeer"

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

export default function Home() {
  const router = useRouter()
  const playbackId = router.query.playbackId?.toString()

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
    <div className={styles.container}>
      <Head>
        <title>VOD Token Gating Sample</title>
        <meta name="description" content="VOD Token Gating Sample" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Wallet Connect Button  & links */}
      <div className="flex justify-end mt-10 font-matter mr-5 ml-5">
        <ConnectButton />
      </div>

      <div className="flex flex-col text-lg font-matter">
        <p className="text-center">
          VOD Token Gating with Lit Signing Conditions
        </p>
        <p className="text-center text-sm mt-1 mb-4 text-slate-400 font-thin container mx-auto sm:px-[200px] px-[100px]">
          Prove your identity to access the gated content.
        </p>
      </div>
      <div className="flex justify-center text-center font-matter">
        <div className="overflow-auto border border-solid border-blue-600 rounded-md p-6 w-3/5 ">
          {readyToPlay ? (
            <div className="flex flex-col justify-center items-center ml-5 font-matter">
              <div className="border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 lg:w-3/4 w-100 font-matter">
                <GatedPlayer playbackUrl={playbackUrl?.toString()} />
              </div>
            </div>
          ) : !address ? (
            <p>Please connect your wallet</p>
          ) : pinfoError || (gateState === "closed" && gatingError) ? (
            <p className="text-red-600">{gatingError || pinfoError?.message}</p>
          ) : (
            <p>Checking gate...</p>
          )}
        </div>
      </div>
    </div>
  )
}
