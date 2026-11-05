"use client"

/** One portrait cover; apps without library art 404, so drop them and let the column close up. */
export const CoverImg = ({ appid }: { appid: number }) => (
  // eslint-disable-next-line @next/next/no-img-element -- decorative CDN covers; next/image would proxy each one
  <img
    src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`}
    alt=""
    loading="lazy"
    decoding="async"
    onError={(e) => {
      e.currentTarget.remove()
    }}
  />
)
