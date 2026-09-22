import { getProjects } from './projects/utils'
import { HomeContent } from './home-content'

export default async function Personal() {
  const projects = await getProjects()

  // Show only last 2 projects (newest) on homepage
  const selectedProjects = projects.slice(-2)

  return <HomeContent projects={selectedProjects} />
}
