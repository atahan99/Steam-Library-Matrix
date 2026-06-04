const hogwartsLegacyDrmHtml = `
<html>
  <body>
    <div class="DRM_notice">
      Incorporates 3rd-party DRM: Denuvo Anti-Tampering
    </div>
    <div class="DRM_notice">
      Requires agreement to a 3rd-party EULA
    </div>
  </body>
</html>
`

const activationLimitHtml = `
<html>
  <body>
    <div class="DRM_notice">
      5 a day machine activation limit
    </div>
  </body>
</html>
`

const securomHtml = `
<html>
  <body>
    <div class="DRM_notice">
      Incorporates 3rd-party DRM: SecuROM
    </div>
  </body>
</html>
`

const noDrmHtml = `<html><body><div>No notices here</div></body></html>`

export const FIXTURES = {
  hogwartsLegacyDrmHtml,
  activationLimitHtml,
  securomHtml,
  noDrmHtml,
}
