import Head from "next/head"
import { useMemo, useState, useEffect } from "react"
import { Asset, LivepeerProvider, Player } from "@livepeer/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useNetwork } from "wagmi"
import styles from "../styles/MintNFT.module.css"
import "lit-share-modal-v3/dist/ShareModal.css"
import LitJsSdk from "lit-js-sdk"
import { useRouter } from "next/router"
import { usePlaybackInfo } from "@livepeer/react/dist/declarations/src/hooks"
import { PlaybackInfo } from "@livepeer/react"

interface BetaPlaybackInfo extends PlaybackInfo {
  meta: PlaybackInfo["meta"] & {
    playbackPolicy: {
      type: "public" | "lit_signing_condition"
      unifiedAccessControlConditions: any[]
      resourceId: Record<string, string>
    }
  }
}

const litNodeClient = new LitJsSdk.LitNodeClient()

export default function Home() {
  const router = useRouter()
  const playbackId = router.query.playbackId?.toString()

  const { address } = useAccount()
  const { chain } = useNetwork()

  const [litConnected, setIsLitConnected] = useState(false)

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

  const { data: playbackInfo, status: playbackInfoStatus } = usePlaybackInfo<
    LivepeerProvider,
    BetaPlaybackInfo
  >({
    playbackId,
  })

  // pre-sign the most common ethereum chain
  useEffect(() => {
    if (playbackInfo?.meta?.playbackPolicy?.type === "lit_signing_condition") {
      Promise.resolve().then(async () => {
        try {
          setAuthSig({
            ethereum: await LitJsSdk.checkAndSignAuthMessage({
              chain: "ethereum",
              switchChain: false,
            }),
          })
        } catch (err: any) {
          alert(`Error signing auth message: ${err?.message || err}`)
        }
      })
    }
  }, [address, chain?.id, authSig])

  const readyToPlay = useMemo(
    () =>
      address &&
      playbackInfoStatus === "success" &&
      (playbackInfo?.meta?.playbackPolicy?.type !== "lit_signing_condition" ||
        litConnected),
    [address, litConnected, playbackInfoStatus, playbackInfo]
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
                <Player playbackId={playbackId} />
              </div>
            </div>
          ) : (
            <p>Please connect your wallet</p>
          )}
        </div>
      </div>
    </div>
  )
}
