import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import { Configuration, OpenAIApi } from "openai"

const postsDirectory = path.join(process.cwd(), 'posts')

export function getSortedPostsData() {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory)
  const allPostsData = fileNames.map(fileName => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '')

    // Read markdown file as string
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Combine the data with the id
    return {
      id,
      ...(matterResult.data as { date: string; title: string })
    }
  })
  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

export function getAllPostIds() {
  const fileNames = fs.readdirSync(postsDirectory)

  // Returns an array that looks like this:
  // [
  //   {
  //     params: {
  //       id: 'ssg-ssr'
  //     }
  //   },
  //   {
  //     params: {
  //       id: 'pre-rendering'
  //     }
  //   }
  // ]

  return fileNames.map(fileName => {
    return {
      params: {
        id: fileName.replace(/\.md$/, '')
      }
    }
  })
}

export async function getPostData(id: string) {
  const fullPath = path.join(postsDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // Use gray-matter to parse the post metadata section
  const matterResult = matter(fileContents)

  // Use remark to convert markdown into HTML string
  const processedContent = await remark()
    .use(html)
    .process(matterResult.content)
  const contentHtml = processedContent.toString()

  // Combine the data with the id and contentHtml
  return {
    id,
    contentHtml,
    ...(matterResult.data as { date: string; title: string })
  }
}

export async function getGeneratedPostData(id: string){
  const title = id.replace(/\_/g, " ")
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion("text-davinci-002", {
    prompt: title,
    max_tokens: 16,
    temperature: 0.8
  })
  const content = completion.data.choices[0].text

  return {
    id: title.replace(/[^\w]+/g, "_"),
    content: "TEST",
    date: randomPublishDate(),
    title: title
  }
}

const randomPublishDate = (): string => {
  return new Date(
    Date.now() - Math.floor(Math.random()*1.577 * 10e9)
  ).toISOString().substring(0, 10)
}

export async function getGeneratedPostsData(){
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion("text-davinci-002", {
    prompt: "give me 10 cat blog article titles",
    max_tokens: 100,
    temperature: 0.8
  })
  
  const titlesList = completion.data.choices[0].text.split(/\d\./)
  // const titlesList = [completion.data.choices[0].text]
  const allPostsData = titlesList.map(title => {
    // Combine the data with the id and date
    return {
      id: title.replace(/[^\w]+/g, "_").toLowerCase(),
      date: randomPublishDate(),
      title: title
    }
  })
  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}
