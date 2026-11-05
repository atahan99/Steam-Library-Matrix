"use client"

/** One mosaic capsule; delisted apps have no capsule art, so hide the broken frame. */
export const CapsuleImg = ({ appid }: { appid: number }) => (
  // eslint-disable-next-line @next/next/no-img-element -- decorative CDN capsules; next/image would proxy 56 images
  <img
    src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_231x87.jpg`}
    alt=""
    loading="lazy"
    decoding="async"
    onError={(e) => {
      e.currentTarget.style.visibility = "hidden"
    }}
  />
)
