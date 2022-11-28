import Head from 'next/head';
import Image from 'next/image';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAsset, useUpdateAsset, useCreateAsset, Player } from '@livepeer/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDropzone } from 'react-dropzone';
import BarLoader from 'react-spinners/BarLoader';
import PulseLoader from 'react-spinners/PulseLoader';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import styles from '../styles/MintNFT.module.css';
import Link from 'next/link';

import { videoNftAbi } from '../components/videoNftAbi';

export default function Home() {
  const [video, setVideo] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [externalLink, setExternalLink] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [supply, setSupply] = useState<number>();
  const [isWriteInProgress, setIsWriteInProgress] = useState<boolean>();
  const [isUpdateAsset, setIsUpdateAsset] = useState<boolean>();
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState<boolean>(false);
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0 && acceptedFiles?.[0]) {
      setVideo(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'video/*': ['*.mp4'],
    },
    maxFiles: 1,
    onDrop,
  });

  const {
    data: asset,
    error,
    status: assetStatus,
  } = useAsset({
    assetId: createdAsset?.[0].id,
    refetchInterval: (asset) => (asset?.storage?.status?.phase !== 'ready' ? 5000 : false),
  });

  const { mutate: updateAsset, status: updateStatus } = useUpdateAsset(
    asset
      ? {
          name: assetName,
          assetId: asset.id,
          storage: {
            ipfs: true,
            metadata: {
              externalLink,
              description,
              supply,
            },
          },
        }
      : undefined
  );

  const progressFormatted = useMemo(
    () =>
      progress?.[0].phase === 'failed'
        ? 'Failed to process video.'
        : progress?.[0].phase === 'waiting'
        ? 'Waiting'
        : progress?.[0].phase === 'uploading'
        ? `Uploading: ${Math.round(progress?.[0]?.progress * 100)}%`
        : progress?.[0].phase === 'processing'
        ? `Processing: ${Math.round(progress?.[0].progress * 100)}%`
        : null,
    [progress]
  );

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
      // console.log('updateAsset', updateStatus);
      setIsUpdateAsset(true);
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Livepeer Sample App</title>
        <meta name='description' content='Livepeer Studio Sample App' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      {/* Wallet Connect Button */}
      <div className='flex justify-between mt-10'>
        <Link href='https://www.livepeer.studio'>
          <Image src='/studio-logo.png' alt='Livepeer logo' width={180} height={50}></Image>
        </Link>
        <ConnectButton />
      </div>

      {/* Social */}
      <div className='flex mt-6 ml-4'>
        <div className='mr-10'>
          <Link href='https://discord.com/channels/423160867534929930/821523349292711946'>
            <Image
              className='ml-2'
              src='/icons8-discord-48.png'
              alt='Discord logo'
              width={40}
              height={40}
            />
          </Link>
          <p className='text-blue-600'>Support</p>
        </div>
        <div>
          <Link href='https://twitter.com/intent/tweet?text=Video%20NFT%20created%20on%20Livepeer%20Studio%20app'>
            <Image src='/icons8-twitter-48.png' alt='Twitter logo' width={40} height={40} />
          </Link>
          <p className='text-blue-600'>Share</p>
        </div>
      </div>

      {/* Main page */}
      <div className={styles.main}>
        <h1 className={styles.title}>Livepeer Studio Mint Video NFT</h1>
      </div>
      <div className='flex justify-center text-center'>
        <div className='border-4 border-solid border-gray-600 rounded-md p-6 w-3/5'>
          {address ? (
            <div>
              {asset?.status?.phase !== 'ready' && (
                <div className={styles.drop} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <div>
                    <p className='text-center'>
                      Drag and drop or <span>browse files</span>
                    </p>
                  </div>
                </div>
              )}

              {asset?.storage?.ipfs?.cid ? (
                <div className='flex flex-col justify-center ml-5'>
                  <div className={styles.player}>
                    <Player playbackId={asset?.storage?.ipfs?.cid} />
                  </div>
                  <div className='overflow-scroll border-4 border-solid border-gray-600 rounded-md p-6 mb-4 mt-5'>
                    <p className='text-left text-blue-600'>CID: {asset?.storage?.ipfs?.cid}</p>
                    <p className='text-left text-blue-600'>URL: {asset?.storage?.ipfs?.url}</p>
                    <p className='text-left text-blue-600'>
                      Gateway URL: {asset?.storage?.ipfs?.gatewayUrl}
                    </p>
                  </div>
                  <div>
                    {contractWriteData?.hash && isSuccess ? (
                      <a
                        target='_blank'
                        href={`https://mumbai.polygonscan.com/tx/${contractWriteData.hash}`}
                        rel='noreferrer'
                      >
                        <button className=' bg-blue-600 rounded p-3 text-white hover:text-gray-800'>
                          View Mint Transaction
                        </button>
                      </a>
                    ) : contractWriteError ? (
                      <p>{contractWriteError.message}</p>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    {isUploadingToIPFS && (
                      <p className='text-white '>
                        Uploading to IPFS
                        <span>
                          <br />
                          <PulseLoader size={7} color='#245cd8' />
                        </span>
                      </p>
                    )}
                  </div>
                  <div className={styles.progress}>
                    {video ? (
                      <p>{progressFormatted}</p>
                    ) : asset?.storage?.status ? (
                      <p>{asset?.storage?.status?.progress}</p>
                    ) : (
                      <p>Select a video file to upload.</p>
                    )}
                  </div>
                  <div className={styles.form}>
                    <label htmlFor='asset-name' className='text-left'>
                      Name:{' '}
                    </label>
                    <input
                      className='rounded mt-3'
                      type='text'
                      value={assetName}
                      name='asset-name'
                      required
                      disabled={disabled}
                      onChange={(e) => setAssetName(e.target.value)}
                    />
                    <label htmlFor='external-link' className='text-left'>
                      External Link:{' '}
                    </label>
                    <input
                      className='rounded mt-3'
                      type='text'
                      value={externalLink}
                      name='external-link'
                      disabled={disabled}
                      onChange={(e) => setExternalLink(e.target.value)}
                    />
                    <label htmlFor='description' className='text-left'>
                      Description:{' '}
                    </label>
                    <textarea
                      className='rounded mt-3'
                      value={description}
                      name='description'
                      disabled={disabled}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <label htmlFor='supply' className='text-left'>
                      Supply Amount:{' '}
                    </label>
                    <input
                      className='w-12 rounded mt-3'
                      type='number'
                      value={supply}
                      name='supply-amount'
                      disabled={disabled}
                      onChange={(e) => setSupply(Number(e.target.value))}
                    />
                  </div>
                  {/* Upload Asset */}
                  <div className='flex justify-center'>
                    {asset?.status?.phase !== 'ready' ? (
                      <button
                        className=' bg-blue-600 rounded p-3'
                        onClick={() => {
                          if (video) {
                            setDisabled(true), createAsset?.();
                          }
                        }}
                        disabled={!video || isLoading || Boolean(asset)}
                      >
                        Mint NFT
                        <br />
                        {isLoading && <BarLoader color='#fff' />}
                      </button>
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
