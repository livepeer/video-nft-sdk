import Head from 'next/head';
import Image from 'next/image';
import discordLogo from '../public/icons8-discord-48.png';
import twitterLogo from '../public/icons8-twitter-48.png';
import { useMemo, useCallback, useState } from 'react';
import { useAsset, useUpdateAsset, useCreateAsset, Player } from '@livepeer/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDropzone } from 'react-dropzone';
import BarLoader from 'react-spinners/BarLoader';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import styles from '../styles/MintNFT.module.css';
import Link from 'next/link';

import { videoNftAbi } from './videoNftAbi';

export default function Home() {
  const [video, setVideo] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [externalLink, setExternalLink] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [supply, setSupply] = useState<number>();
  const [isExportStarted, setIsExportedStarted] = useState(false);

  const { address } = useAccount();

  // Creating an asset

  const {
    mutate: createAsset,
    data: assetId,
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
    assetId,
    enabled: assetId?.length === 36,
    refetchInterval: (asset) => (asset?.storage?.status?.phase !== 'ready' ? 5000 : false),
  });

  const { mutate: updateAsset, status: updateStatus } = useUpdateAsset(
    asset
      ? {
          assetId: asset.id,
          storage: {
            ipfs: true,
            metadata: {
              assetName,
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
      progress
        ? `Uploading: ${Math.round(progress * 100)}%`
        : asset?.status?.progress
        ? `Processing: ${Math.round(asset?.status?.progress * 100)}%`
        : null,
    [progress, asset?.status?.progress]
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
      (isExportStarted && asset?.status?.phase !== 'ready') ||
      isContractWriteLoading,
    [asset, assetStatus, updateStatus, isContractWriteLoading, createStatus, isExportStarted]
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Livepeer Sample App</title>
        <meta name='description' content='Livepeer Studio Sample App' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      {/* <div className={styles.footer}>
        <div>
          <Link href='https://discord.com/channels/423160867534929930/821523349292711946'>
            <Image
              className={styles.discordLogo}
              src={discordLogo}
              alt='Discord logo'
              width={40}
              height={40}
            />
          </Link>
          <p>Support</p>
        </div>
        <div>
          <Link href='https://twitter.com/intent/tweet?text=Video%20NFT%20created%20on%20Livepeer%20Studio%20app'>
            <Image
              className={styles.discordLogo}
              src={twitterLogo}
              alt='Twitter logo'
              width={40}
              height={40}
            />
          </Link>
          <p>Share</p>
        </div>
      </div> */}
      {/* Wallet COnnect Button */}
      <div className={styles.walletButton}>
        <ConnectButton />
      </div>
      <div className={styles.main}>
        <h1 className={styles.title}>Livepeer Studio Mint Video NFT</h1>
      </div>
      <div className={styles.main2}>
        <div className={styles.card}>
          {!address ? (
            <p>Please connect your wallet</p>
          ) : (
            address && (
              <div>
                {asset?.status?.phase !== 'ready' ? (
                  <div className={styles.drop} {...getRootProps()}>
                    <input {...getInputProps()} />
                    <div>
                      <p>
                        Drag and drop or <span>browse files</span>
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Display Upload Progress */}
                <div className={styles.progress}>
                  {video ? <p>{progressFormatted}</p> : <p>Select a video file to upload.</p>}
                  {/* {progressFormatted && <p>{progressFormatted}</p>} */}
                </div>
                <div className={styles.form}>
                  <label htmlFor='asset-name' className={styles.label}>
                    Name:{' '}
                  </label>
                  <input
                    className={styles.formInput}
                    type='text'
                    value={assetName}
                    name='asset-name'
                    required
                    onChange={(e) => setAssetName(e.target.value)}
                  />
                  <label htmlFor='external-link' className={styles.label}>
                    External Link:{' '}
                  </label>
                  <input
                    className={styles.formInput}
                    type='text'
                    value={externalLink}
                    name='external-link'
                    onChange={(e) => setExternalLink(e.target.value)}
                  />
                  <label htmlFor='description' className={styles.label}>
                    Description:{' '}
                  </label>
                  <textarea
                    className={styles.formInput}
                    value={description}
                    name='description'
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <label htmlFor='supply' className={styles.label}>
                    Supply Amount:{' '}
                  </label>
                  <input
                    className={styles.formInput}
                    type='number'
                    value={supply}
                    name='supply-amount'
                    onChange={(e) => setSupply(Number(e.target.value))}
                  />
                </div>
                {/* Upload Asset */}
                <div>
                  {asset?.status?.phase !== 'ready' ? (
                    <button
                      className={styles.button}
                      onClick={() => {
                        if (video) {
                          createAsset?.();
                        }
                      }}
                      disabled={!video || isLoading || Boolean(asset)}
                    >
                      Upload Asset
                      <br />
                      {isLoading && <BarLoader color='#fff' />}
                    </button>
                  ) : asset?.status?.phase === 'ready' &&
                    asset?.storage?.status?.phase !== 'ready' ? (
                    <button
                      className={styles.button}
                      onClick={() => {
                        if (asset?.id) {
                          setIsExportedStarted(true);
                          updateAsset?.();
                        }
                      }}
                      disabled={
                        !updateAsset ||
                        isLoading ||
                        Boolean(asset?.storage?.ipfs?.cid) ||
                        !assetName ||
                        !description
                      }
                    >
                      Upload to IPFS
                      <br />
                      {isLoading && <BarLoader color='#fff' />}
                    </button>
                  ) : contractWriteData?.hash && isSuccess ? (
                    <a
                      className={styles.link}
                      target='_blank'
                      href={`https://mumbai.polygonscan.com/tx/${contractWriteData.hash}`}
                      rel='noreferrer'
                    >
                      <button>View Mint Transaction</button>
                    </a>
                  ) : contractWriteError ? (
                    <p>{contractWriteError.message}</p>
                  ) : asset?.storage?.status?.phase === 'ready' && write ? (
                    <button
                      className={styles.button}
                      onClick={() => {
                        write();
                      }}
                    >
                      Mint NFT
                      <br />
                      {isSuccess && <BarLoader color='#fff' />}
                    </button>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            )
          )}
        </div>
        {asset?.storage?.ipfs?.cid ? (
          <div className={styles.player}>
            <Player playbackId={asset?.storage?.ipfs?.cid} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
