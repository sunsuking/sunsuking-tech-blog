export default interface Post
  extends Pick<
    Queries.MarkdownRemarkFrontmatter,
    "title" | "desc" | "createdAt" | "category" | "alt"
  > {
  id: string
  slug: Queries.MarkdownRemarkFields["slug"]
  thumbnail?: string
}
