import Head from "next/head"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import styles from "../../styles/MintNFT.module.css"
import "lit-share-modal-v3/dist/ShareModal.css"
import { useRouter } from "next/router"
import GatedPlayer from "../../components/GatedPlayer"
import { useAccount } from "wagmi"

export default function Home() {
  const router = useRouter()
  const playbackId = router.query.playbackId?.toString() || ""

  const { address } = useAccount()

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
        <div className="overflow-auto border border-solid border-blue-600 rounded-md p-6 w-3/5">
          {!address ? (
            <p>Please connect your wallet</p>
          ) : (
            <div className="w-full aspect-video">
              <GatedPlayer playbackId={playbackId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
