import React from "react"

import { Helmet } from "react-helmet"
import { Script } from "gatsby"

import useSiteMetadata from "~/src/hooks/useSiteMetadata"

import defaultOpenGraphImage from "../images/og-default.png"

const DEFAULT_LANG = "en"

type Meta = React.DetailedHTMLProps<
  React.MetaHTMLAttributes<HTMLMetaElement>,
  HTMLMetaElement
>[]

interface SEOProperties
  extends Pick<Queries.MarkdownRemarkFrontmatter, "title"> {
  desc?: Queries.Maybe<string>
  image?: Queries.Maybe<string>
  meta?: Meta
}

const SEO: React.FC<SEOProperties> = ({ title, desc = "", image }) => {
  const site = useSiteMetadata()
  const description = desc || site.description
  const ogImageUrl =
    site.siteUrl ?? "" + (image || (defaultOpenGraphImage as string))

  return (
    <React.Fragment>
      <Helmet
        htmlAttributes={{ lang: site.lang ?? DEFAULT_LANG }}
        title={title ?? ""}
        titleTemplate={`%s | ${site.title}`}
        meta={
          [
            {
              name: "description",
              content: description,
            },
            {
              property: "og:title",
              content: title,
            },
            {
              property: "og:description",
              content: description,
            },
            {
              property: "og:type",
              content: "website",
            },
            {
              name: "twitter:card",
              content: "summary",
            },
            {
              name: "twitter:creator",
              content: site.author,
            },
            {
              name: "twitter:title",
              content: title,
            },
            {
              name: "twitter:description",
              content: description,
            },
            {
              property: "image",
              content: ogImageUrl,
            },
            {
              property: "og:image",
              content: ogImageUrl,
            },
            {
              property: "twitter:image",
              content: ogImageUrl,
            },
          ] as Meta
        }
      >
        {/* For Google Analytics */}
        <Script
        dangerouslySetInnerHTML={{__html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-NQX93QR4');`}}
        />
      </Helmet>
    </React.Fragment>
  )
}

export default SEO
