/** One portrait cover; apps without library art 404 and are swapped by the parent. */
export const CoverImg = ({
  appid,
  onError,
}: {
  appid: number
  onError: (appid: number) => void
}) => (
  // eslint-disable-next-line @next/next/no-img-element -- decorative CDN covers; next/image would proxy each one
  <img
    src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`}
    alt=""
    loading="lazy"
    decoding="async"
    onError={() => onError(appid)}
  />
)
