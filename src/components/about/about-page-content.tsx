import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"
import {
  aboutAffiliation,
  aboutAttributions,
  aboutDataProvenance,
  aboutDataSources,
  aboutFeatures,
  aboutHero,
  aboutHowItWorks,
  aboutMission,
  aboutPrivacy,
  aboutTerminology,
} from "@/content/about"
import { LibraryOrbit } from "@/components/visual/library-orbit"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AboutPageContentProps = {
  embedded?: boolean
}

const aboutTableCell =
  "min-w-0 whitespace-normal break-words align-top"

const aboutCardProps = { "data-highlight": true } as const

export const AboutPageContent = ({ embedded = false }: AboutPageContentProps) => {
  return (
    <div
      className={
        embedded
          ? "mx-auto flex w-full max-w-4xl flex-col gap-12 pb-10"
          : "mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-12 md:py-16"
      }
    >
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {aboutHero.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold text-primary md:text-4xl">
          {aboutHero.title}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {aboutHero.subtitle}
        </p>
        <LibraryOrbit variant="about" className="mx-auto mt-6" />
        <div className="pt-2">
          <Link
            href="/"
            className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Import a Steam profile
          </Link>
        </div>
      </header>

      <section aria-labelledby="about-mission-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-mission-heading">{aboutMission.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            {aboutMission.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-features-heading">
        <div className="mb-4 space-y-1">
          <h2
            id="about-features-heading"
            className="text-xl font-semibold text-foreground"
          >
            Dashboard features
          </h2>
          <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-center text-sm text-muted-foreground">
            <span>Replace</span>
            <Badge variant="outline" className="font-mono">
              [steamid]
            </Badge>
            <span>with your Steam ID after import.</span>
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {aboutFeatures.map((feature) => (
            <li key={feature.title}>
              <Card {...aboutCardProps} className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="break-words">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge
                    variant="secondary"
                    className="block max-w-full break-all font-mono text-[11px]"
                  >
                    {feature.pathPattern}
                  </Badge>
                  {feature.highlights?.length ? (
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {feature.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2">
                          <span aria-hidden className="text-primary">
                            ·
                          </span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="about-sources-heading">
        <div className="mb-4 space-y-1">
          <h2
            id="about-sources-heading"
            className="text-xl font-semibold text-foreground"
          >
            Data sources
          </h2>
          <p className="text-sm text-muted-foreground">
            External services that power enrichment. Refresh cadence is typically
            seven days per game unless forced from Data Status.
          </p>
        </div>
        <Card {...aboutCardProps}>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={`min-w-[8rem] ${aboutTableCell}`}>
                    Source
                  </TableHead>
                  <TableHead className={aboutTableCell}>Provides</TableHead>
                  <TableHead className={`hidden md:table-cell ${aboutTableCell}`}>
                    Used in
                  </TableHead>
                  <TableHead
                    className={`hidden lg:table-cell ${aboutTableCell}`}
                  >
                    Fetch
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aboutDataSources.map((source) => (
                  <TableRow key={source.name}>
                    <TableCell className={`font-medium ${aboutTableCell}`}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${source.name} (opens in new tab)`}
                      >
                        {source.name}
                        <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                      </a>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        {source.refreshCadence}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        Used in: {source.usedIn}
                      </p>
                    </TableCell>
                    <TableCell className={`text-muted-foreground ${aboutTableCell}`}>
                      {source.provides}
                      {source.limitations ? (
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {source.limitations}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`hidden text-muted-foreground md:table-cell ${aboutTableCell}`}
                    >
                      {source.usedIn}
                      {source.matchingMethod ? (
                        <p className="mt-1 text-xs">
                          Match: {source.matchingMethod}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`hidden font-mono text-xs text-muted-foreground lg:table-cell ${aboutTableCell}`}
                    >
                      {source.fetchMethod}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-provenance-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-provenance-heading">
              {aboutDataProvenance.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aboutDataProvenance.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
            <ul className="flex flex-wrap gap-2">
              {aboutDataProvenance.bundledSources.map((source) => (
                <li key={source}>
                  <Badge variant="secondary">{source}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-how-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-how-heading">{aboutHowItWorks.title}</CardTitle>
            <CardDescription>{aboutHowItWorks.intro}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {aboutHowItWorks.steps.map((step) => (
                <li key={step.step} className="flex gap-4">
                  <Badge
                    variant="outline"
                    className="mt-0.5 size-7 shrink-0 justify-center rounded-full p-0 font-mono"
                    aria-hidden
                  >
                    {step.step}
                  </Badge>
                  <div>
                    <h3 className="font-medium text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-terms-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-terms-heading">
              {aboutTerminology.title}
            </CardTitle>
            <CardDescription>
              Post-fix labels used across Anti-Cheat and ProtonDB sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {aboutTerminology.items.map((item) => (
                <div key={item.term}>
                  <dt className="font-medium text-foreground">{item.term}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {item.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-privacy-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-privacy-heading">{aboutPrivacy.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {aboutPrivacy.items.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="about-attribution-heading">
        <Card {...aboutCardProps}>
          <CardHeader>
            <CardTitle id="about-attribution-heading">Attribution</CardTitle>
            <CardDescription>{aboutAffiliation}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {aboutAttributions.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-0.5 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${item.name} — ${item.credit} (opens in new tab)`}
                  >
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      {item.name}
                      <ExternalLinkIcon
                        className="size-3 opacity-70"
                        aria-hidden
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.credit}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
