import React, { useLayoutEffect, useState } from "react"

import { type PageProps, graphql } from "gatsby"
import styled from "styled-components"

import Analytics from "~/src/components/analytics"
import CategoryFilter from "~/src/components/catetgoryFilter"
import PostGrid from "~/src/components/postGrid"
import SEO from "~/src/components/seo"
import useSiteMetadata from "~/src/hooks/useSiteMetadata"
import Layout from "~/src/layouts/layout"
import type Post from "~/src/types/Post"
import { Maybe } from "graphql/jsutils/Maybe"

const Home = ({
  pageContext,
  data,
}: PageProps<Queries.Query, Queries.MarkdownRemarkFrontmatter>) => {
  const [posts, setPosts] = useState<Post[]>([])
  const currentCategory = pageContext.category
  const postData = data.allMarkdownRemark.edges

  useLayoutEffect(() => {
    const filteredPostData = currentCategory
      ? postData.filter(({ node }) =>
          node?.frontmatter?.category?.includes(
            currentCategory?.toString() ?? "",
          ),
        )
      : postData

    for (const { node } of filteredPostData) {
      const { id, fields, frontmatter } = node
      const { slug } = fields!
      const { title, desc, createdAt, category, thumbnail, alt } = frontmatter!
      const { childImageSharp } = thumbnail!

      setPosts(previousPost => [
        ...previousPost,
        {
          id,
          slug,
          title,
          desc,
          createdAt,
          category,
          thumbnail: childImageSharp?.id,
          alt,
        },
      ])
    }
  }, [currentCategory, postData])

  const site = useSiteMetadata()
  const postTitle = currentCategory || site.postTitle

  return (
    <Layout>
      <SEO title="Home" />
      <Main>
        <Content>
          <CategoryFilter categoryList={data.allMarkdownRemark.group} />
          <PostTitle>{postTitle}</PostTitle>
          <PostGrid posts={posts} />
        </Content>
        </Analytics>
      </Main>
    </Layout>
  )
}

const Main = styled.main`
  min-width: var(--min-width);
  min-height: calc(100vh - var(--nav-height) - var(--footer-height));
  background-color: var(--color-background);
`

const Content = styled.div`
  box-sizing: content-box;
  width: 87.5%;
  max-width: var(--width);
  padding-top: var(--sizing-lg);
  padding-bottom: var(--sizing-lg);
  margin: 0 auto;

  @media (max-width: ${({ theme }) => theme.device.sm}) {
    padding-top: var(--grid-gap-lg);
    width: 87.5%;
  }
`

const PostTitle = styled.h2`
  font-size: 2rem;
  font-weight: var(--font-weight-extra-bold);
  margin-bottom: var(--sizing-md);
  line-height: 1.21875;

  @media (max-width: ${({ theme }) => theme.device.sm}) {
    font-size: 1.75rem;
  }
`

export const query = graphql`
  query Home {
    allMarkdownRemark(
      filter: { fileAbsolutePath: { regex: "/(posts/blog)/" } }
      limit: 2000
      sort: { frontmatter: { createdAt: DESC } }
    ) {
      group(field: { frontmatter: { category: SELECT } }) {
        fieldValue
        totalCount
      }
      totalCount
      edges {
        node {
          id
          frontmatter {
            title
            category
            createdAt(formatString: "YYYY-MM-DD")
            desc
            thumbnail {
              childImageSharp {
                id
              }
              base
            }
            alt
          }
          fields {
            slug
          }
        }
      }
    }
  }
`

export default Home
