import Head from "next/head"
import { useMemo, useCallback, useState, useEffect } from "react"
import {
  Asset,
  LivepeerProvider,
  useAsset,
  useCreateAsset,
} from "@livepeer/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useDropzone } from "react-dropzone"
import BarLoader from "react-spinners/BarLoader"
import { useAccount, useNetwork } from "wagmi"
import styles from "../styles/MintNFT.module.css"
import "lit-share-modal-v3/dist/ShareModal.css"
import LitJsSdk from "lit-js-sdk"
import LitShareModal from "lit-share-modal-v3"
import { BsCheck2Circle } from "react-icons/bs"

type LitGateParams = {
  unifiedAccessControlConditions: any[] | null
  permanent: boolean
  chains: string[]
  authSigTypes: string[]
}

interface BetaAsset extends Asset {
  playbackPolicy: {
    type: "public" | "lit_signing_condition"
    unifiedAccessControlConditions: any[]
    resourceId: Record<string, string>
  }
}

const litNodeClient = new LitJsSdk.LitNodeClient()

export default function Home() {
  const [video, setVideo] = useState<File | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [litGateParams, setLitGateParams] = useState<LitGateParams>({
    unifiedAccessControlConditions: null,
    permanent: false,
    chains: [],
    authSigTypes: [],
  })
  const { address } = useAccount()
  const { chain } = useNetwork()

  const [litConnected, setIsLitConnected] = useState(false)
  const [authSig, setAuthSig] = useState<Record<string, object>>({})
  const [savedSigningConditionsId, setSavedSigningConditionsId] =
    useState<string>()

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
  // pre-sign the most common ethereum chain
  useEffect(() => {
    if (address && chain?.id && !authSig.ethereum) {
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

  // Creating an asset
  const {
    mutate: createAsset,
    data: createdAsset,
    status: createStatus,
    progress,
  } = useCreateAsset(
    video
      ? {
          // TODO: Need a way to set playback policy here without mutating SDK D:
          sources: [{ name: video.name, file: video }] as const,
        }
      : null
  )

  // Drag and Drop file function
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0 && acceptedFiles?.[0]) {
      setVideo(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "video/*": [".mp4"],
    },
    maxFiles: 1,
    onDrop,
  })

  // Getting asset and refreshing for the status
  const {
    data: asset,
    error,
    status: assetStatus,
  } = useAsset<LivepeerProvider, BetaAsset>({
    assetId: createdAsset?.[0].id,
    refetchInterval: (asset) =>
      asset?.storage?.status?.phase !== "ready" ? 5000 : false,
  })

  // Displaying the  progress of uploading and processing the asset
  const progressFormatted = useMemo(
    () =>
      progress?.[0].phase === "failed"
        ? "Failed to process video."
        : progress?.[0].phase === "waiting"
        ? "Waiting"
        : progress?.[0].phase === "uploading"
        ? `Video Uploading: ${Math.round(progress?.[0]?.progress * 100)}%`
        : progress?.[0].phase === "processing"
        ? `Video Processing: ${Math.round(progress?.[0].progress * 100)}%`
        : null,
    [progress]
  )

  const isLoading = useMemo(
    () =>
      createStatus === "loading" ||
      assetStatus === "loading" ||
      (asset && asset?.status?.phase !== "ready") ||
      (asset?.storage && asset?.storage?.status?.phase !== "ready"),
    [asset, assetStatus, createStatus]
  )

  // Runs after an asset is created
  useEffect(() => {
    if (
      createStatus === "success" &&
      asset?.id &&
      asset?.id !== savedSigningConditionsId
    ) {
      setSavedSigningConditionsId(asset?.id)
      Promise.resolve().then(async () => {
        try {
          // TODO: possibly sign other chains here

          await litNodeClient.saveSigningCondition({
            unifiedAccessControlConditions:
              asset?.playbackPolicy.unifiedAccessControlConditions,
            authSig,
            resourceId: asset?.playbackPolicy.resourceId,
          })
        } catch (err: any) {
          alert(`Error saving signing condition: ${err?.message || err}`)
        }
      })
    }
  }, [createStatus, savedSigningConditionsId, authSig, asset])

  const canUpload = useMemo(
    () =>
      litConnected &&
      video &&
      litGateParams.unifiedAccessControlConditions?.length &&
      createStatus === "idle" &&
      !asset,
    [litConnected, video, litGateParams, createStatus, asset]
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
          Upload an asset that will only be accessible to users passing the
          specified Lit access conditions.
        </p>
      </div>
      <div className="flex justify-center text-center font-matter">
        {/* Displays upload form */}
        <div className="overflow-auto border border-solid border-blue-600 rounded-md p-6 w-3/5 ">
          {address ? (
            <div>
              {asset?.status?.phase !== "ready" && (
                <div
                  className="border border-dotted border-blue-600 rounded p-5 font-matter mb-4 cursor-pointer"
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  <div className="font-matter flex-row">
                    {video ? (
                      <div className="font-matter flex justify-center">
                        <p className="text-xl text-green-600 font-matter">
                          File Selected{" "}
                        </p>
                        <BsCheck2Circle className="text-green-600 text-xl mt-1 ml-4" />
                      </div>
                    ) : (
                      <p className="text-center text-lg">
                        Click to browse or drag a file here
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Displays the player with NFT information */}
              {asset?.status?.phase === "ready" ? (
                <div>
                  <div className="flex flex-col justify-center items-center ml-5 font-matter">
                    <p className="mt-4 text-white">
                      Your video is now ready to be played! Access and test
                      token gated playback on the player page:
                      <a
                        target={"_blank"}
                        rel={"noreferrer"}
                        href={`/watch/${asset?.playbackId}`}
                      >
                        Player
                      </a>
                    </p>
                    {/* <div className="border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 lg:w-3/4 w-100 font-matter">
                      <Player playbackId={asset?.playbackId} />
                    </div> */}
                  </div>
                </div>
              ) : (
                <>
                  {/* Form for Token Gating */}
                  <div className={styles.form}>
                    <label
                      htmlFor="lit-access-conditions"
                      className="text-left"
                    >
                      Lit Unified Access Control Conditions:{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      className="rounded bg-slate-700 mb-2 h-52"
                      value={
                        !litGateParams.unifiedAccessControlConditions
                          ? ""
                          : JSON.stringify(
                              litGateParams.unifiedAccessControlConditions,
                              null,
                              2
                            )
                      }
                      placeholder="Click Edit below to add conditions."
                      name="lit-access-conditions"
                      disabled={true}
                    />
                    <div className="flex flex-row content-start">
                      <input
                        type="checkbox"
                        name="lit-access-conditions-permanent"
                        checked={litGateParams.permanent}
                        onChange={() => {
                          setLitGateParams((curr) => ({
                            ...curr,
                            permanent: !curr.permanent,
                          }))
                        }}
                      />
                      <label
                        htmlFor="lit-access-conditions-permanent"
                        className="ml-2"
                      >
                        {" "}
                        Permanent
                      </label>
                    </div>
                    <button
                      className="border border-transparent hover:text-blue-600 rounded-lg px-5 py-2 bg-slate-800 hover:border-blue-600 font-matter"
                      onClick={() => setShowShareModal(true)}
                    >
                      Edit
                    </button>

                    {showShareModal && (
                      <div className={styles["lit-share-modal"]}>
                        <LitShareModal
                          onClose={() => {
                            setShowShareModal(false)
                          }}
                          chainsAllowed={[
                            "ethereum",
                            "polygon",
                            "arbitrum",
                            "optimism",
                            "rinkeby",
                            "goerli",
                            "ropstein",
                            "mumbai",
                          ]}
                          injectInitialState={true}
                          initialUnifiedAccessControlConditions={
                            litGateParams?.unifiedAccessControlConditions
                          }
                          onUnifiedAccessControlConditionsSelected={(
                            val: LitGateParams
                          ) => {
                            setLitGateParams(val)
                            setShowShareModal(false)
                          }}
                          darkMode={true}
                          injectCSS={false}
                        />
                      </div>
                    )}
                    <br />
                  </div>

                  {/* Upload Asset */}
                  <div className="flex justify-center">
                    <div>
                      {!canUpload ? (
                        <button className="rounded-lg p-3 bg-slate-800 opacity-50 cursor-not-allowed">
                          Upload File
                        </button>
                      ) : (
                        <button
                          className="border border-transparent hover:text-blue-600 rounded-lg px-5 py-3 bg-slate-800 mr-5 hover:border-blue-600 font-matter"
                          onClick={createAsset}
                          // disabled={!video || isLoading || Boolean(asset)}
                        >
                          Upload File
                          <br />
                          {isLoading && <BarLoader color="#fff" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-center my-5 font-matter text-blue-600">
                    <p className="text-xl text-white font-matter whitespace-pre-line">
                      {progressFormatted}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p>Please connect your wallet</p>
          )}
        </div>
      </div>
    </div>
  )
}
