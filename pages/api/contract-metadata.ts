import type { NextApiRequest, NextApiResponse } from "next"

type ContractMetadata = {
  name: string
  description: string
  image: string
  external_link: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContractMetadata>
) {
  res.setHeader("Cache-Control", "max-age=600")
  res.status(200).json({
    name: "Long Take NFT Original",
    description: `\
Long Take NFTs are video NFTs up to 10GB in size that are transcoded to optimally playback for viewers on any device or bandwidth.

Powered by Livepeer.`,
    image: "ipfs://bafybeicl26ubzfie6y4c5qnav3x54t43cyeyswcbrmvld4l4c7et3x3pua",
    external_link: "https://longtake.xyz",
  })
}
