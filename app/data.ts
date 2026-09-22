type Project = {
  name: string
  description: string
  link: string
  video: string
  id: string
}

type WorkExperience = {
  company: string
  title: string
  start: string
  end: string
  link: string
  id: string
}

type Education = {
  degree: string
  institution: string
  start: string
  end: string
  link: string
  id: string
}

type BlogPost = {
  title: string
  description: string
  link: string
  uid: string
}

type SocialLink = {
  label: string
  link: string
}


export const WORK_EXPERIENCE: WorkExperience[] = [
  {
    company: 'Film Frames Media',
    title: 'Design Lead',
    start: '2024',
    end: 'Present',
    link: 'https://filmframesmedia.com/',
    id: 'work1',
  },
  {
    company: 'Rootflo',
    title: 'Visual Designer',
    start: '2023',
    end: '2024',
    link: 'https://www.rootflo.ai/',
    id: 'work2',
  },
  {
    company: 'KITES Foundation',
    title: 'Graphic Designer',
    start: '2022',
    end: '2023',
    link: 'https://kitesfoundation.org/',
    id: 'work3',
  },
]

export const EDUCATION: Education[] = [
  {
    degree: 'Bachelor of Commerce & Computer Applications',
    institution: 'Mahatma Gandhi University',
    start: '2018',
    end: '2021',
    link: 'https://www.mgu.ac.in/', // optional
    id: '1',
  },
]

export const BLOG_POSTS: BlogPost[] = [
  {
    title: 'Exploring the Intersection of Design, AI, and Design Engineering',
    description: 'How AI is changing the way we design',
    link: '/blog/exploring-the-intersection-of-design-ai-and-design-engineering',
    uid: 'blog-1',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Contra',
    link: 'https://contra.com/yamin_mathew_2v725kja',
  },
  {
    label: 'LinkedIn',
    link: 'https://www.linkedin.com/in/yamin-mathew-341729194/',
  },
  {
    label: 'Instagram',
    link: 'https://www.instagram.com/yaminmathew',
  },
  {
    label: 'Bento',
    link: 'https://bento.me/mathewyamin',
  },
]

export const EMAIL = 'mathewyamin@gmail.com'
export const PHONE = '+91 82819 75215'
