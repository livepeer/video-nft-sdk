import Head from 'next/head';
import Image from 'next/image';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAsset, useUpdateAsset, useCreateAsset, Player, PlaybackMonitor } from '@livepeer/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDropzone } from 'react-dropzone';
import BarLoader from 'react-spinners/BarLoader';
import PulseLoader from 'react-spinners/PulseLoader';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import styles from '../styles/MintNFT.module.css';
import Link from 'next/link';
import titleImage from '../assets/titleImage.png';
import { BsCheck2Circle } from 'react-icons/bs';
import { BsTwitter } from 'react-icons/bs';

import { videoNftAbi } from '../components/videoNftAbi';

export default function Home() {
  const [video, setVideo] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [description, setDescription] = useState<string>();
  const [isWriteInProgress, setIsWriteInProgress] = useState<boolean>();
  const [isUpdateAsset, setIsUpdateAsset] = useState<boolean>();
  const [isFileSelected, setIsFileSelected] = useState<boolean>(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  const [buttonClicked, setButtonClicked] = useState<boolean>(false);
  const { address } = useAccount();

  // Creating an asset
  const {
    mutate: createAsset,
    data: createdAsset,
    status: createStatus,
    progress,
  } = useCreateAsset(
    video
      ? {
          sources: [{ name: assetName, file: video }] as const,
        }
      : null
  );

  // Drag and Drop file function
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0 && acceptedFiles?.[0]) {
      setVideo(acceptedFiles[0]);
      setIsFileSelected(true);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'video/*': ['.mp4'],
    },
    maxFiles: 1,
    onDrop,
  });

  // Getting asset and refreshing for the status
  const {
    data: asset,
    error,
    status: assetStatus,
  } = useAsset({
    assetId: createdAsset?.[0].id,
    refetchInterval: (asset) => (asset?.storage?.status?.phase !== 'ready' ? 5000 : false),
  });

  // Storing asset to IPFS with metadata by updating the asset
  const { mutate: updateAsset, status: updateStatus } = useUpdateAsset(
    asset
      ? {
          name: assetName,
          assetId: asset.id,
          storage: {
            ipfs: true,
            metadata: {
              description,
            },
          },
        }
      : undefined
  );

  // Displaying the  progress of uploading and processing the asset
  const progressFormatted = useMemo(
    () =>
      progress?.[0].phase === 'failed'
        ? 'Failed to process video.'
        : progress?.[0].phase === 'waiting'
        ? 'Waiting'
        : progress?.[0].phase === 'uploading'
        ? `Video Uploading: ${Math.round(progress?.[0]?.progress * 100)}%`
        : progress?.[0].phase === 'processing'
        ? `Video Processing: ${Math.round(progress?.[0].progress * 100)}%`
        : null,
    [progress]
  );

  const processing = useMemo(
    () => (progress?.[0].phase === 'uploading' ? 'Processing to ensure optimal playback...' : null),
    [progress]
  );

  const uploading = useMemo(
    () =>
      progress?.[0].phase === 'processing'
        ? `Processing to ensure optimal playback ✅
     Uploading to the Livepeer network...`
        : null,
    [progress]
  );

  const uploadIPFS = useMemo(
    () =>
      progress?.[0].phase === 'ready'
        ? `Processing to ensure optimal playback ✅
     Uploading to the Livepeer network ✅
      Storing on IPFS...`
        : null,
    [progress]
  );

  // Providing the mint contract information
  const { config } = usePrepareContractWrite({
    // The demo NFT contract address on Polygon Mumbai
    address: '0xA4E1d8FE768d471B048F9d73ff90ED8fcCC03643',
    abi: videoNftAbi,
    // Function on the contract
    functionName: 'mint',
    // Arguments for the mint function
    args:
      address && asset?.storage?.ipfs?.nftMetadata?.url
        ? [address, asset?.storage?.ipfs?.nftMetadata?.url]
        : undefined,
    enabled: Boolean(address && asset?.storage?.ipfs?.nftMetadata?.url),
  });

  // Writing to the mint contract
  const {
    data: contractWriteData,
    isSuccess,
    isLoading: isContractWriteLoading,
    write,
    error: contractWriteError,
  } = useContractWrite(config);

  const isLoading = useMemo(
    () =>
      createStatus === 'loading' ||
      assetStatus === 'loading' ||
      updateStatus === 'loading' ||
      (asset && asset?.status?.phase !== 'ready') ||
      (asset?.storage && asset?.storage?.status?.phase !== 'ready') ||
      isContractWriteLoading,
    [asset, assetStatus, updateStatus, isContractWriteLoading, createStatus]
  );

  // Runs after an asset is created
  useEffect(() => {
    if (!isUpdateAsset && updateAsset && updateStatus === 'idle') {
      setIsUploadingToIPFS(true);
      setIsFileSelected(false);
      // console.log('updateAsset', updateStatus);
      setIsUpdateAsset(true);
      setIsProcessing(true);
      updateAsset();
    }
  }, [updateAsset, updateStatus, isUpdateAsset]);

  // Runs after an asset is uploaded to IPFS
  useEffect(() => {
    if (!isWriteInProgress && asset?.storage?.status?.phase === 'ready' && write) {
      // console.log('assetPhase', asset?.storage?.status?.phase);
      setIsWriteInProgress(true);
      write();
    }
  }, [write, asset?.storage?.status?.phase, isWriteInProgress]);

  let twitterLink = `https://twitter.com/intent/tweet?text=Check%20out%20my%20Video%20NFT%20📽️%0D%20${assetName}%20minted%20on%20the%20%23LongTakeNFT%20Publisher.%0D%0D🛠️%20Built%20with%20%40livepeerstudio%0D%20🌐%20Powered%20by%20%40Livepeer%0D%0DCreate%20your%20%23LongTakeNft%20here%20👇%20https://lvpr.link/3VQQzU8`;

  return (
    <div className={styles.container}>
      <Head>
        <title> Long Take NFT Publisher</title>
        <meta name='description' content=' Long Take NFT Publisher' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      {/* Wallet Connect Button  & links */}
      <div className='flex justify-between mt-10 font-matter'>
        <div className='ml-2 font-matter'>
          <Link
            href='https://discord.com/channels/423160867534929930/1044996697090162698'
            className='text-white mr-4 text-lg hover:text-blue-600 w-16'
          >
            Tutorials
          </Link>
          <Link
            href='https://discord.com/channels/423160867534929930/1044996697090162698'
            className='text-white mr-4 text-lg hover:text-blue-600 w-16'
          >
            FAQs
          </Link>
          <Link
            href='https://discord.com/channels/423160867534929930/1044996697090162698'
            className='text-white text-lg hover:text-blue-600 w-16'
          >
            Support
          </Link>
        </div>
        <ConnectButton />
      </div>

      {/* Title Image*/}
      <div className='flex justify-center mt-8 font-matter'>
        <Image src={titleImage} alt='title image' width={700} height={200} priority />
      </div>
      <div className='flex justify-center mb-4 text-lg font-matter'>
        <p>Built with Livepeer Studio. Powered by Livepeer.</p>
      </div>
      <div className='flex justify-center text-center font-matter'>
        {/* Displays upload form */}
        <div className='overflow-auto border border-solid border-blue-600 rounded-md p-6 w-3/5 '>
          {address ? (
            <div>
              {asset?.status?.phase !== 'ready' && (
                <div
                  className='border border-dotted border-blue-600 rounded p-5 font-matter mb-4 cursor-pointer'
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  <div className='font-matter flex-row'>
                    {video ? (
                      <div className='font-matter flex justify-center'>
                        <p className='text-xl text-green-600 font-matter'>File Selected </p>
                        <BsCheck2Circle className='text-green-600 text-xl mt-1 ml-4' />
                      </div>
                    ) : (
                      <p className='text-center text-lg'>Click to browser or drag a file here</p>
                    )}
                  </div>
                </div>
              )}

              {/* Displays the player with NFT information */}
              {asset?.storage?.ipfs?.cid ? (
                <div>
                  <div className='flex flex-col justify-center items-center ml-5 font-matter'>
                    <p className='mt-4 text-white'>
                      Your video is now ready to be minted! Complete minting process in your wallet.
                    </p>
                    <div className='border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 lg:w-3/4 w-100 font-matter'>
                      <Player playbackId={asset?.storage?.ipfs?.cid} />
                    </div>
                    <div className='items-center w-3/4 font-matter'>
                      {contractWriteData?.hash && isSuccess ? (
                        <div className='flex font-matter'></div>
                      ) : contractWriteError ? (
                        <div>
                          <button
                            className='border border-transparent hover:text-blue-600 rounded-lg px-5 py-3 bg-slate-800 mr-5 hover:border-blue-600 font-matter'
                            onClick={() => setShowErrorMessage(!showErrorMessage)}
                          >
                            {showErrorMessage ? <p>Hide Error</p> : <p>Show Error</p>}
                          </button>
                          <a href={`/`} rel='noreferrer'>
                            <button className='border border-transparent hover:text-blue-600 rounded-lg px-5 py-3 bg-slate-800 mr-5 hover:border-blue-600 font-matter'>
                              Return to Form
                            </button>
                          </a>
                          {showErrorMessage && (
                            <div className='border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 overflow-x-auto font-matter'>
                              <p className='text-center text-red-600 font-matter'>
                                {contractWriteError.message}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <></>
                      )}
                    </div>
                    {/* Card with NFT Information */}
                    <div className='border border-solid border-blue-600 rounded-md p-6 mb-4 mt-5 lg:w-3/4 w-96 font-matter'>
                      <div className='grid grid-row-2 font-matter'>
                        <h1 className='text-5xl place-self-start font-matter'>{assetName}</h1>
                        <a
                          href={twitterLink}
                          className='place-self-end'
                          target='_blank'
                          rel='noreferrer'
                        >
                          <button className='bg-sky-500 hover:bg-slate-200 rounded-md pr-4 p-2 mb-1  font-matter hover:text-sky-500'>
                            <span className='flex font-matter'>
                              <BsTwitter className='text-xl mt-0.5 ' />
                              <p className='text-xl  ml-1'>Share</p>
                            </span>{' '}
                          </button>
                        </a>
                      </div>
                      <div className='border-b-2 border-zinc-600 font-matter'></div>
                      <div className='mt-2 font-matter'>
                        <p className='text-start text-xl font-matter'>{description}</p>
                      </div>
                      <p className='text-center text-white hover:text-blue-600 mt-10 break-words font-matter'>
                        <div className='border-b-2 border-zinc-600 mb-4 font-matter'></div>
                        Gateway URL:
                        <br />
                        <a href={asset?.storage?.ipfs?.gatewayUrl}>
                          {asset?.storage?.ipfs?.gatewayUrl}
                        </a>
                      </p>
                      {isSuccess && (
                        <a
                          target='_blank'
                          href={`https://mumbai.polygonscan.com/tx/${contractWriteData?.hash}`}
                          rel='noreferrer'
                        >
                          <button className=' mt-6 rounded px-5 py-2 hover:bg-slate-800 mr-5 bg-zinc-700 font-matter'>
                            View Transaction
                          </button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {buttonClicked && video && (
                    <p className='text-2xl font-matter'>
                      Once Video is Uploaded and Processed, it will be stored on IPFS and ready for
                      minting
                    </p>
                  )}
                  <div className='text-center my-5 font-matter text-blue-600'>
                    {video ? (
                      <p className='text-xl text-green-500 font-matter whitespace-pre-line'>
                        {uploading}
                        {processing}
                        {uploadIPFS}
                      </p>
                    ) : (
                      <></>
                    )}
                  </div>
                  {/* Form for NFT creation */}
                  <div className={styles.form}>
                    <label htmlFor='asset-name' className='text-left'>
                      Name: <span className='text-red-600'>*</span>
                    </label>
                    <input
                      className='rounded bg-slate-700 p-1'
                      type='text'
                      value={assetName}
                      name='asset-name'
                      required
                      placeholder='Type the name of your NFT here'
                      disabled={disabled}
                      onChange={(e) => setAssetName(e.target.value)}
                    />
                    <br />
                    <label htmlFor='description' className='text-left'>
                      Description: <span className='text-red-600'>*</span>
                    </label>
                    <textarea
                      className='rounded bg-slate-700 mb-5 p-1'
                      value={description}
                      name='description'
                      required
                      placeholder='Type a description of your NFT here'
                      disabled={disabled}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {/* Upload Asset */}
                  <div className='flex justify-center'>
                    {asset?.status?.phase !== 'ready' ? (
                      <div>
                        {!description ? (
                          <button className='rounded-lg p-3 bg-slate-800 opacity-50 cursor-not-allowed'>
                            Create NFT
                          </button>
                        ) : (
                          <button
                            className='border border-transparent hover:text-blue-600 rounded-lg px-5 py-3 bg-slate-800 mr-5 hover:border-blue-600 font-matter'
                            onClick={() => {
                              if (video) {
                                setDisabled(true), setButtonClicked(true), createAsset?.();
                              }
                            }}
                            // disabled={!video || isLoading || Boolean(asset)}
                          >
                            Create NFT
                            <br />
                            {isLoading && <BarLoader color='#fff' />}
                          </button>
                        )}

                        <p className='mt-4 text-white'>
                          When your wallet interface appears, your video is ready to be minted!
                        </p>
                      </div>
                    ) : (
                      <></>
                    )}
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
  );
}
