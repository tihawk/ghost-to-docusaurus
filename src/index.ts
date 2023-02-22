import fs from 'fs'
import path from 'path'

interface TypeList {
  [key: string]: {
    db: {
      meta: object,
      data: {
        posts: {
          "id": string
          "uuid": string
          "title": string
          "slug": string
          "mobiledoc": string
          "html": string
          "comment_id": string
          "plaintext": string
          "feature_image": string
          "featured": number
          "type": string
          "status": "published"
          "locale": any
          "visibility": "public"
          "email_recipient_filter": any
          "author_id": "1",
          "created_at": "\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d"
          "updated_at": "\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d"
          "published_at": "\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d"
          "custom_excerpt": any
          "codeinjection_head": any
          "codeinjection_foot": any
          "custom_template": any
          "canonical_url": any
        }[]
        tags: {
          "id": string
          "name": string
          "slug": string
          // "description": null,
          // "feature_image": null,
          // "parent_id": null,
          // "visibility": "public",
          // "og_image": null,
          // "og_title": null,
          // "og_description": null,
          // "twitter_image": null,
          // "twitter_title": null,
          // "twitter_description": null,
          // "meta_title": null,
          // "meta_description": null,
          // "codeinjection_head": null,
          // "codeinjection_foot": null,
          // "canonical_url": null,
          // "accent_color": null,
          "created_at": "\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d"
          "updated_at": "\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d"
        }[]
        posts_tags: {
          "id": string
          "post_id": string
          "tag_id": string
          "sort_order": number
        }[]
        users: {
          "id": string
          "name": string
          "slug": string
          "password": string
          "email": string
          "profile_image": string
          // "cover_image": null,
          // "bio": null,
          // "website": null,
          // "location": null,
          // "facebook": null,
          // "twitter": null,
          // "accessibility": "{\"nightShift\":false,\"whatsNew\":{\"lastSeenDate\":\"2021-02-03T16:27:00.000+00:00\"},\"launchComplete\":true}",
          // "status": "active",
          // "locale": null,
          // "visibility": "public",
          // "meta_title": null,
          // "meta_description": null,
          // "tour": null,
          // "last_seen": "2023-02-21 20:29:43",
          // "created_at": "2021-03-18 23:49:10",
          // "updated_at": "2023-02-21 20:29:43"
        }[]
        posts_authors: {
          "id": string
          "post_id": string
          "author_id": string
          "sort_order": number
        }[]
      }
    }[]
  } // adjusting require this in order to some json data type
}
const readPath = './ghost-export/'

export function declareEachJSON(): TypeList {
  const fileNames = fs.readdirSync(readPath).filter(file => file.match(/\.json$/))
  const typeList: TypeList = {}

  fileNames.forEach((fileName: string)=> {
    let typeName = fileName.match(/(^.*?)\.json/)
    if(typeName){
      typeList[typeName[1]] = JSON.parse(fs.readFileSync(readPath + fileName, 'utf8').toString())
    }
  })
  return typeList
}

const data = declareEachJSON()

if (!fs.existsSync('./docusaurus-import')) {
  fs.mkdirSync('./docusaurus-import')
}
for (const filename of Object.keys(data)) {
  const subdir = path.join('./docusaurus-import', filename)
  if (!fs.existsSync(subdir)) {
    fs.mkdirSync(subdir)
  }

  const dbData = data[filename].db[0].data
  for (const post of dbData.posts) {
    let content = post.plaintext?.
      replace(/(^|[^\n])\n(?!\n)/g, "$1 ") // https://stackoverflow.com/questions/18011260/regex-to-match-single-new-line-regex-to-match-double-new-line
      .replace(/\s(\w+)(\n|\s)\[(htt.*)\]/g, ' [$1]($3)')
      .replace(/(\\\\\(|\\\\\))/g, '$')
      .replace(/\\\\/g, '\\')
    const htmlContent = post.html//?.replace(/(<\w+>)/g, '\n\t$1').replace(/(<\/\w+>)/g, '\n$1')
    const figureRegex = new RegExp('(<figure.+?</figure>)', 'g')
    const figureCaptionRegex = new RegExp('<figcaption>(.+?)</figcaption>')
    const figures = htmlContent?.match(figureRegex)
    if (figures?.length) {
      for (const figure of figures) {
        const cleanFigure = figure.replace(/(<img.*?)(>)/g, '$1/$2') + '\n\n'

        const caption = figure.match(figureCaptionRegex)
        if (caption?.length) {
          const cleanCaption = caption[1].replace(/<\/?[\w="\./:\s]+>/g, '')

          let tempReplaced = content.replace(cleanCaption, cleanFigure)
          if(content === tempReplaced) {
            console.warn('Couldn\'t find where to place image. Adding it to end of post. Post name:', post.title)
            content += '\n' + cleanFigure
          } else {
            content = tempReplaced
          }
        }
      }
    }

    const postTagsIds = dbData.posts_tags.filter(el => el.post_id === post.id).map(el => el.tag_id)
    const tags: string[] = dbData.tags.filter(el => postTagsIds.includes(el.id)).map(tag => tag.name)

    const postAuthorIds = dbData.posts_authors.filter(el => el.post_id === post.id).map(el => el.author_id)
    const authors: typeof dbData.users = dbData.users.filter(el => postAuthorIds.includes(el.id))

    let md = '---\n'
    post.slug ? md += `slug: ${post.slug}\n` : ''
    post.title ? md += `title: ${post.title}\n` : ''
    if (authors.length) {
      md += `authors:\n`
      for (const author of authors) {
        md += `  - name: ${author.name}\n    image_url: ${author.profile_image}\n`
      }
    }
    tags.length ? md += `tags: [${tags.join(', ')}]\n` : ''
    md += '---\n\n'
    md += content

    const mdFilename = post.published_at?.replace(' ', '-') + post.slug + '.md'

    fs.writeFileSync(path.join(subdir, mdFilename), md)
  }
}