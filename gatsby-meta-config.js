/**
 * @typedef {Object} Links
 * @prop {string} github Your github repository
 */

/**
 * @typedef {Object} MetaConfig
 * @prop {string} title Your website title
 * @prop {string} description Your website description
 * @prop {string} author Maybe your name
 * @prop {string} siteUrl Your website URL
 * @prop {string} lang Your website Language
 * @prop {string} utterances Github repository to store comments
 * @prop {Links} links
 * @prop {string} favicon Favicon Path
 */

/** @type {MetaConfig} */
const metaConfig = {
  title: "개발 블로그",
  description: `sunsuking's Blog`,
  author: "sunsuking",
  siteUrl: "https://sunsuking.github.io/sunsuking-tech-blog/",
  lang: "ko",
  utterances: "sunsuking/sunsuking-tech-blog-comments",
  links: {
    github: "https://sunsuking.github.io/sunsuking-tech-blog/",
  },
  favicon: "src/images/icon.png",
}

// eslint-disable-next-line no-undef
module.exports = metaConfig
