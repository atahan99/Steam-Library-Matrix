# GetItems spike report

Generated: 2026-06-05T05:45:42.361Z

## Sample appids

570, 730, 2630, 1245620, 1174180, 1086940, 1091500, 1938090, 2358720, 1145360, 1599340, 1817070, 1888930, 1966720, 2050650, 2183900, 2215430, 2322010, 2406770, 252490

## Auth

- **STEAM_API_KEY on `IStoreBrowseService/GetItems/v1/`**: HTTP 405
- Plain Web API key may **not** authorize GetItems; the store frontend uses a session `access_token`. Further batch tests skipped.

## Recommendation

Do **not** migrate bulk appdetails to GetItems until auth is confirmed (likely needs store access_token, not STEAM_API_KEY). Keep storefront `/api/appdetails` on the SQLite throttle path (Phases 1–3). Deck compat and Denuvo HTML have no keyed equivalent.

**No keyed equivalent** for Deck compatibility report (`ajaxgetdeckappcompatibilityreport`) or Denuvo store-page HTML — these must remain on Phases 1–3 storefront throttle.