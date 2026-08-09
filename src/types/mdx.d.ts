declare module "*.mdx" {
  import type { ComponentType } from "react"
  const MDXContent: ComponentType
  export default MDXContent
  export const metadata: import("@/lib/content/types").EditorialMetadata | import("@/lib/content/types").TutorialMetadata
}
