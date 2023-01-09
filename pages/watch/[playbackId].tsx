import Head from "next/head"
import { useMemo, useState, useEffect } from "react"
import { LivepeerProvider, Player } from "@livepeer/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import styles from "../../styles/MintNFT.module.css"
import "lit-share-modal-v3/dist/ShareModal.css"
import LitJsSdk from "lit-js-sdk"
import { useRouter } from "next/router"
import { usePlaybackInfo } from "@livepeer/react/hooks"
import { PlaybackInfo } from "@livepeer/react"

interface BetaPlaybackInfo extends PlaybackInfo {
  meta: PlaybackInfo["meta"] & {
    playbackPolicy: AssetPlaybackPolicy
  }
}

const litNodeClient = new LitJsSdk.LitNodeClient()

export default function Home() {
  const router = useRouter()
  const playbackId = router.query.playbackId?.toString()

  const { address } = useAccount()
  const [litConnected, setIsLitConnected] = useState(false)
  const [gatingError, setGatingError] = useState<string>()
  const [gateState, setGateState] = useState<"open" | "closed" | "checking">()

  useEffect(() => {
    litNodeClient
      .connect()
      .then(() => setIsLitConnected(true))
      .catch(() =>
        alert(
          "Failed connecting to Lit network! Refresh the page to try again."
        )
      )
  })

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

  // pre-sign the most common ethereum chain
  useEffect(() => {
    console.log("checking gating conditions", playbackInfo)
    const { type, resourceId, unifiedAccessControlConditions } =
      playbackInfo?.meta?.playbackPolicy ?? {}
    if (
      litConnected &&
      playbackInfoStatus === "success" &&
      type === "lit_signing_condition" &&
      playbackUrl
    ) {
      console.log("gating conditions met")
      setGateState("checking")
      Promise.resolve().then(async () => {
        try {
          console.log("resolving")
          // TODO: Compute and sign other chains based on conditions
          const ethSig = await LitJsSdk.checkAndSignAuthMessage({
            chain: "ethereum",
            switchChain: false,
          })
          console.log("ethSig", ethSig)

          const jwt = await litNodeClient.getSignedToken({
            unifiedAccessControlConditions,
            authSig: { ethereum: ethSig },
            resourceId,
          })
          console.log("jwt", jwt)

          const res = await fetch(
            `${playbackUrl.protocol}//${playbackUrl.host}/verify-lit-jwt`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ playbackId, jwt }),
              credentials: "include",
            }
          )
          console.log("verify jwt", res)
          if (res.ok) {
            setGateState("open")
            return
          }

          const { errors } = await res.json()
          setGatingError(
            `You are not allowed to view this content. Server error: ${errors[0]}`
          )
          setGateState("closed")
        } catch (err: any) {
          setGatingError(`Error signing auth token: ${err?.message || err}`)
          setGateState("closed")
        }
      })
    } else {
      setGateState("open")
    }
  }, [litConnected, playbackInfoStatus, playbackInfo, playbackId, playbackUrl])

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
                <Player playbackId={playbackId} objectFit="contain" />
              </div>
            </div>
          ) : gatingError || pinfoError ? (
            <p className="text-red-600">{gatingError || pinfoError?.message}</p>
          ) : !address ? (
            <p>Please connect your wallet</p>
          ) : (
            <p>Checking gate...</p>
          )}
        </div>
      </div>
    </div>
  )
}
